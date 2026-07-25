/**
 * Seed demo Appwrite auth user + profile + attendance history.
 * Run: npm run seed:appwrite
 *
 * Options:
 *   --clear          Delete this user's attendance docs before seeding
 *   --days=90        Number of calendar days to walk back (default 90)
 *   --email=...      Demo account email (default demo@checkin.app)
 *   --password=...   Demo account password (default Demo@12345)
 *
 * Never import this from the Expo app.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, Databases, Users, ID, Permission, Role, Query } from 'node-appwrite';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const CLEAR = hasFlag('--clear');
const DAYS = Math.max(14, Number(getArg('--days', '90')) || 90);
const DEMO_EMAIL = getArg('--email', process.env.SEED_EMAIL || 'demo@checkin.app');
const DEMO_PASSWORD = getArg('--password', process.env.SEED_PASSWORD || 'Demo@12345');
const DEMO_NAME = getArg('--name', 'Ava Sharma');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const PROFILES_ID = process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles';
const ATTENDANCE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID || 'attendance_records';

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error(
    'Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY / EXPO_PUBLIC_APPWRITE_DATABASE_ID',
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);
const users = new Users(client);

const OFFICE = {
  officeLocation: 'Vashi- Navi Mumbai',
  officeLatitude: 19.077,
  officeLongitude: 72.998,
  workShiftStart: '09:00',
  workShiftEnd: '18:00',
  role: 'Field Engineer',
  department: 'Operations',
};

const DEMO_PROFILE_EXTRAS = {
  phone: '9876543210',
  workEmail: 'ava.sharma@example.com',
  dateOfJoining: '2022-04-11',
  employmentType: 'Permanent',
  reportingManager: 'Rahul Mehta',
  grade: 'L3',
  gender: 'Female',
  dateOfBirth: '1996-08-19',
  bloodGroup: 'B+',
  currentCity: 'Navi Mumbai',
  currentState: 'Maharashtra',
  panNumber: 'ABCDE1234F',
  aadhaarNumber: 'XXXX XXXX 4321',
  uanNumber: '100234567890',
  esiNumber: '3112345678',
  pfAccountNumber: 'MH/BAN/1234567/000/0001234',
  bankName: 'HDFC Bank',
  bankIfsc: 'HDFC0001234',
  bankAccountNumber: '50100234567890',
  emergencyContactName: 'Rohit Sharma',
  emergencyContactPhone: '9988776655',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayOfWeek(date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(date);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', day: '2-digit' }).format(date);
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
}

function formatClock(hours, minutes) {
  return `${pad(hours)}:${pad(minutes)}`;
}

function atLocal(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function ownerPermissions(userId) {
  // Role.users() read so Appwrite Console / admins can open the document (avoids 404).
  return [
    Permission.read(Role.users()),
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

function isAlreadyExists(error) {
  const message = String(error?.message || error).toLowerCase();
  return (
    error?.code === 409 ||
    message.includes('already exists') ||
    message.includes('user_already_exists') ||
    error?.type === 'user_already_exists' ||
    error?.type === 'document_already_exists'
  );
}

async function ensureDemoUser() {
  const listed = await users.list([Query.equal('email', DEMO_EMAIL), Query.limit(1)]);
  if (listed.users.length > 0) {
    const existing = listed.users[0];
    console.log(`Demo user exists: ${existing.$id} (${existing.email})`);
    // Keep password in sync for local testing convenience.
    try {
      await users.updatePassword(existing.$id, DEMO_PASSWORD);
    } catch {
      /* optional on older servers */
    }
    try {
      await users.updateName(existing.$id, DEMO_NAME);
    } catch {
      /* optional */
    }
    return existing;
  }

  const created = await users.create(ID.unique(), DEMO_EMAIL, undefined, DEMO_PASSWORD, DEMO_NAME);
  console.log(`Demo user created: ${created.$id}`);
  return created;
}

async function ensureProfile(userId) {
  const existing = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);

  const payload = {
    userId,
    name: DEMO_NAME,
    role: OFFICE.role,
    employeeId: `EMP-DEMO01`,
    department: OFFICE.department,
    officeLocation: OFFICE.officeLocation,
    officeLatitude: OFFICE.officeLatitude,
    officeLongitude: OFFICE.officeLongitude,
    workShiftStart: OFFICE.workShiftStart,
    workShiftEnd: OFFICE.workShiftEnd,
    ...DEMO_PROFILE_EXTRAS,
  };

  if (existing.documents.length > 0) {
    const doc = existing.documents[0];
    await databases.updateDocument(DATABASE_ID, PROFILES_ID, doc.$id, payload);
    console.log(`Profile updated: ${doc.$id}`);
    return doc.$id;
  }

  try {
    const documentId = ID.unique();
    const created = await databases.createDocument(
      DATABASE_ID,
      PROFILES_ID,
      documentId,
      { ...payload, documentId },
      ownerPermissions(userId),
    );
    console.log(`Profile created: $id=${created.$id} documentId=${created.documentId}`);
    return created.$id;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    // employeeId unique collision — fetch again
    const again = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
      Query.equal('userId', userId),
      Query.limit(1),
    ]);
    if (again.documents[0]) {
      await databases.updateDocument(DATABASE_ID, PROFILES_ID, again.documents[0].$id, payload);
      return again.documents[0].$id;
    }
    throw error;
  }
}

async function listAllAttendance(userId) {
  const docs = [];
  let cursor = undefined;
  for (;;) {
    const queries = [Query.equal('userId', userId), Query.limit(100), Query.orderDesc('$createdAt')];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments(DATABASE_ID, ATTENDANCE_ID, queries);
    docs.push(...page.documents);
    if (page.documents.length < 100) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }
  return docs;
}

async function clearAttendance(userId) {
  const docs = await listAllAttendance(userId);
  let deleted = 0;
  for (const doc of docs) {
    await databases.deleteDocument(DATABASE_ID, ATTENDANCE_ID, doc.$id);
    deleted += 1;
  }
  console.log(`Cleared ${deleted} attendance documents`);
}

/**
 * Deterministic variety for filters / calendar / metrics testing.
 */
function buildDayRecord(date, index) {
  const day = date.getDay(); // 0 Sun … 6 Sat
  if (day === 0 || day === 6) return null; // skip weekends

  const dateIso = toIsoDate(date);
  const dayOfWeek = formatDayOfWeek(date);
  const formattedDate = formatDisplayDate(date);
  const pattern = index % 11;

  // Leave a few weekdays absent for calendar color variety
  if (pattern === 7) {
    return {
      dateIso,
      dayOfWeek,
      formattedDate,
      clockInTime: '00:00',
      clockInTimestamp: atLocal(date, 0, 0).getTime(),
      clockOutTime: null,
      clockOutTimestamp: null,
      totalHoursFormatted: '00:00',
      totalMinutes: 0,
      status: 'ABSENT',
      locationName: OFFICE.officeLocation,
      distanceMeters: 0,
      note: 'Leave / no show (seed)',
    };
  }

  let inH = 9;
  let inM = 0 + (index % 5) * 3;
  let outH = 18;
  let outM = 0 + (index % 4) * 5;
  let status = 'PRESENT';
  let distanceMeters = 12 + (index % 40);
  let note = null;

  if (pattern === 2 || pattern === 5) {
    // Late arrivals
    inH = 9;
    inM = 35 + (index % 20);
    status = 'LATE';
    note = 'Late arrival (seed)';
  } else if (pattern === 4) {
    // Half day
    outH = 13;
    outM = 15;
    status = 'HALF_DAY';
    note = 'Half day (seed)';
  } else if (pattern === 9) {
    // Farther from geofence but still recorded
    distanceMeters = 180 + (index % 120);
    note = 'Near boundary (seed)';
  }

  // Today: leave open shift for clock-out testing (if weekday)
  const todayIso = toIsoDate(new Date());
  const isToday = dateIso === todayIso;

  const clockIn = atLocal(date, inH, inM);
  let clockOut = null;
  let totalMinutes = 0;

  if (!isToday) {
    clockOut = atLocal(date, outH, outM);
    totalMinutes = Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000));
  } else {
    status = status === 'ABSENT' ? 'PRESENT' : status;
    note = 'Open shift today — tap Clock out in the app';
  }

  return {
    dateIso,
    dayOfWeek,
    formattedDate,
    clockInTime: formatClock(inH, inM),
    clockInTimestamp: clockIn.getTime(),
    clockOutTime: clockOut ? formatClock(outH, outM) : null,
    clockOutTimestamp: clockOut ? clockOut.getTime() : null,
    totalHoursFormatted: formatDuration(totalMinutes),
    totalMinutes,
    status,
    locationName: OFFICE.officeLocation,
    distanceMeters,
    note,
  };
}

async function seedAttendance(userId) {
  const existing = await listAllAttendance(userId);
  const existingDates = new Set(existing.map((d) => d.dateIso));

  const start = new Date();
  start.setHours(12, 0, 0, 0);

  let created = 0;
  let skipped = 0;
  const statusCounts = { PRESENT: 0, LATE: 0, HALF_DAY: 0, ABSENT: 0 };

  for (let offset = 0; offset < DAYS; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() - offset);
    const record = buildDayRecord(date, offset);
    if (!record) continue;

    statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;

    if (existingDates.has(record.dateIso)) {
      skipped += 1;
      continue;
    }

    // Native Appwrite unique $id (Console navigation requires this format)
    const documentId = ID.unique();

    const payload = {
      documentId,
      userId,
      dateIso: record.dateIso,
      dayOfWeek: record.dayOfWeek,
      formattedDate: record.formattedDate,
      clockInTime: record.clockInTime,
      clockInTimestamp: record.clockInTimestamp,
      totalHoursFormatted: record.totalHoursFormatted,
      totalMinutes: record.totalMinutes,
      status: record.status,
      locationName: record.locationName,
      distanceMeters: record.distanceMeters,
    };

    if (record.clockOutTime != null) {
      payload.clockOutTime = record.clockOutTime;
      payload.clockOutTimestamp = record.clockOutTimestamp;
    }
    if (record.note) payload.note = record.note;

    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        ATTENDANCE_ID,
        documentId,
        payload,
        ownerPermissions(userId),
      );
      created += 1;
      existingDates.add(record.dateIso);
      if (created <= 3) {
        console.log(`  sample doc: $id=${doc.$id} documentId=${doc.documentId}`);
      }
    } catch (error) {
      if (isAlreadyExists(error)) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { created, skipped, statusCounts };
}

async function main() {
  console.log('Seeding Appwrite demo data...');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Project:  ${PROJECT_ID}`);
  console.log(`Days:     ${DAYS}${CLEAR ? ' (clear first)' : ''}`);

  const user = await ensureDemoUser();
  await ensureProfile(user.$id);

  if (CLEAR) {
    await clearAttendance(user.$id);
  }

  const result = await seedAttendance(user.$id);

  console.log('\nSeed complete');
  console.log({
    userId: user.$id,
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    attendanceCreated: result.created,
    attendanceSkipped: result.skipped,
    statusMix: result.statusCounts,
  });
  console.log('\nSign in to the app with the demo email/password above.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
