/**
 * Appwrite schema bootstrap (server SDK + API key).
 * Run: npm run setup:appwrite
 * Recreate (wipe collections): npm run setup:appwrite -- --recreate
 *
 * Never import this from the Expo app.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, Databases, IndexType, Permission, Role } from 'node-appwrite';

const RECREATE = process.argv.includes('--recreate');

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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'checkin';
const PROFILES_ID = process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles';
const ATTENDANCE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID || 'attendance_records';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

function isAlreadyExists(error) {
  const message = String(error?.message || error);
  return (
    message.toLowerCase().includes('already exists') ||
    error?.code === 409 ||
    error?.type === 'document_already_exists' ||
    error?.type === 'attribute_already_exists' ||
    error?.type === 'index_already_exists' ||
    error?.type === 'collection_already_exists'
  );
}

async function ensureDatabase() {
  try {
    await databases.get(DATABASE_ID);
    console.log(`Database exists: ${DATABASE_ID}`);
  } catch {
    await databases.create(DATABASE_ID, 'CheckIn');
    console.log(`Database created: ${DATABASE_ID}`);
  }
}

async function deleteCollection(id) {
  try {
    await databases.deleteCollection(DATABASE_ID, id);
    console.log(`Deleted collection: ${id}`);
    // Appwrite needs a beat before re-create with same ID
    await new Promise((r) => setTimeout(r, 1500));
  } catch (error) {
    const message = String(error?.message || error).toLowerCase();
    if (error?.code === 404 || message.includes('not found')) {
      console.log(`Collection not found (skip delete): ${id}`);
      return;
    }
    throw error;
  }
}

async function ensureCollection(id, name) {
  try {
    await databases.getCollection(DATABASE_ID, id);
    console.log(`Collection exists: ${id}`);
  } catch {
    await databases.createCollection(
      DATABASE_ID,
      id,
      name,
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      true,
      true,
    );
    console.log(`Collection created: ${id}`);
  }
}

async function createString(collectionId, key, size, required = true) {
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required);
    console.log(`  + string ${collectionId}.${key}`);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    console.log(`  = string ${collectionId}.${key} (exists)`);
  }
}

async function createInteger(collectionId, key, required = true) {
  try {
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  + integer ${collectionId}.${key}`);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    console.log(`  = integer ${collectionId}.${key} (exists)`);
  }
}

async function createFloat(collectionId, key, required = true) {
  try {
    await databases.createFloatAttribute(DATABASE_ID, collectionId, key, required);
    console.log(`  + float ${collectionId}.${key}`);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    console.log(`  = float ${collectionId}.${key} (exists)`);
  }
}

async function waitReady(collectionId) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const collection = await databases.getCollection(DATABASE_ID, collectionId);
    const pending = collection.attributes.filter((attr) => attr.status !== 'available');
    if (pending.length === 0) {
      console.log(`Attributes ready: ${collectionId}`);
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error(`Timed out waiting for attributes on ${collectionId}`);
}

async function createIndex(collectionId, key, type, attributes) {
  try {
    await databases.createIndex(DATABASE_ID, collectionId, key, type, attributes);
    console.log(`  + index ${collectionId}.${key}`);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    console.log(`  = index ${collectionId}.${key} (exists)`);
  }
}

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

function writeEnvIds() {
  const envPath = resolve(process.cwd(), '.env');
  let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  content = upsertEnvValue(content, 'EXPO_PUBLIC_APPWRITE_DATABASE_ID', DATABASE_ID);
  content = upsertEnvValue(content, 'EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID', PROFILES_ID);
  content = upsertEnvValue(
    content,
    'EXPO_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID',
    ATTENDANCE_ID,
  );
  writeFileSync(envPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  console.log('Updated .env with database/collection IDs');
}

async function main() {
  console.log('Setting up Appwrite schema...');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Project:  ${PROJECT_ID}`);
  if (RECREATE) console.log('Mode:     --recreate (delete + create collections)');

  await ensureDatabase();

  if (RECREATE) {
    await deleteCollection(ATTENDANCE_ID);
    await deleteCollection(PROFILES_ID);
  }

  await ensureCollection(PROFILES_ID, 'Profiles');
  await createString(PROFILES_ID, 'documentId', 64, true);
  await createString(PROFILES_ID, 'userId', 64, true);
  await createString(PROFILES_ID, 'name', 128, true);
  await createString(PROFILES_ID, 'role', 128, true);
  await createString(PROFILES_ID, 'employeeId', 64, true);
  await createString(PROFILES_ID, 'department', 128, true);
  await createString(PROFILES_ID, 'officeLocation', 256, true);
  await createFloat(PROFILES_ID, 'officeLatitude', true);
  await createFloat(PROFILES_ID, 'officeLongitude', true);
  await createString(PROFILES_ID, 'workShiftStart', 16, true);
  await createString(PROFILES_ID, 'workShiftEnd', 16, true);

  // Indian payroll / HR compliance (optional so existing docs stay valid)
  await createString(PROFILES_ID, 'phone', 16, false);
  await createString(PROFILES_ID, 'workEmail', 128, false);
  await createString(PROFILES_ID, 'dateOfJoining', 16, false);
  await createString(PROFILES_ID, 'employmentType', 32, false);
  await createString(PROFILES_ID, 'reportingManager', 128, false);
  await createString(PROFILES_ID, 'grade', 32, false);
  await createString(PROFILES_ID, 'gender', 16, false);
  await createString(PROFILES_ID, 'dateOfBirth', 16, false);
  await createString(PROFILES_ID, 'bloodGroup', 8, false);
  await createString(PROFILES_ID, 'currentCity', 64, false);
  await createString(PROFILES_ID, 'currentState', 64, false);
  await createString(PROFILES_ID, 'panNumber', 16, false);
  await createString(PROFILES_ID, 'aadhaarNumber', 16, false);
  await createString(PROFILES_ID, 'uanNumber', 32, false);
  await createString(PROFILES_ID, 'esiNumber', 32, false);
  await createString(PROFILES_ID, 'pfAccountNumber', 64, false);
  await createString(PROFILES_ID, 'bankName', 128, false);
  await createString(PROFILES_ID, 'bankIfsc', 16, false);
  await createString(PROFILES_ID, 'bankAccountNumber', 32, false);
  await createString(PROFILES_ID, 'emergencyContactName', 128, false);
  await createString(PROFILES_ID, 'emergencyContactPhone', 16, false);

  await waitReady(PROFILES_ID);
  await createIndex(PROFILES_ID, 'documentId_unique', IndexType.Unique, ['documentId']);
  await createIndex(PROFILES_ID, 'userId_unique', IndexType.Unique, ['userId']);
  await createIndex(PROFILES_ID, 'employeeId_unique', IndexType.Unique, ['employeeId']);

  await ensureCollection(ATTENDANCE_ID, 'Attendance Records');
  // Explicit documentId attribute (mirrors $id) so it appears as a data column in Console
  await createString(ATTENDANCE_ID, 'documentId', 64, true);
  await createString(ATTENDANCE_ID, 'userId', 64, true);
  await createString(ATTENDANCE_ID, 'dateIso', 16, true);
  await createString(ATTENDANCE_ID, 'dayOfWeek', 32, true);
  await createString(ATTENDANCE_ID, 'formattedDate', 64, true);
  await createString(ATTENDANCE_ID, 'clockInTime', 16, true);
  await createInteger(ATTENDANCE_ID, 'clockInTimestamp', true);
  await createString(ATTENDANCE_ID, 'clockOutTime', 16, false);
  await createInteger(ATTENDANCE_ID, 'clockOutTimestamp', false);
  await createString(ATTENDANCE_ID, 'totalHoursFormatted', 16, true);
  await createInteger(ATTENDANCE_ID, 'totalMinutes', true);
  await createString(ATTENDANCE_ID, 'status', 32, true);
  await createString(ATTENDANCE_ID, 'locationName', 256, true);
  await createInteger(ATTENDANCE_ID, 'distanceMeters', true);
  await createString(ATTENDANCE_ID, 'note', 512, false);
  await waitReady(ATTENDANCE_ID);
  await createIndex(ATTENDANCE_ID, 'documentId_unique', IndexType.Unique, ['documentId']);
  await createIndex(ATTENDANCE_ID, 'user_date_unique', IndexType.Unique, ['userId', 'dateIso']);
  await createIndex(ATTENDANCE_ID, 'userId_idx', IndexType.Key, ['userId']);

  writeEnvIds();

  console.log('\nSchema setup complete:');
  console.log({
    databaseId: DATABASE_ID,
    profilesCollectionId: PROFILES_ID,
    attendanceCollectionId: ATTENDANCE_ID,
  });
}

main().catch((error) => {
  console.error('Schema setup failed:', error);
  process.exit(1);
});
