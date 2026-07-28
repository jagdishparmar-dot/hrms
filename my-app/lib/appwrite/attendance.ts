import { ID, Query, type Databases } from 'node-appwrite';

import {
  buildShiftOccurrence,
  candidateShiftDates,
  computePunchInStatus,
  dateIsoInTimeZone,
  finalizeAttendanceOnPunchOut,
  hhMmFromTimestamp,
  resolvePunchInOccurrence,
  resolvePunchOutOccurrence,
  shiftFromEmployeeFallback,
  type ShiftOccurrence,
} from '@/lib/attendance-shift';
import { appwriteConfig } from '@/lib/appwrite/config';
import { isInsideGeofence } from '@/lib/geo';
import {
  mapAttendance,
  mapEmployee,
  mapPunchSegment,
  mapShiftAssignment,
  mapSite,
  mapWorkShift,
} from '@/lib/appwrite/mappers';
import { employeeDocumentPermissions } from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';
import type {
  AttendancePunchSegment,
  AttendanceRecord,
  EmployeeMembership,
  EmployeeShiftAssignment,
  Site,
  WorkShift,
} from '@/lib/appwrite/types';

/** Max age of an open punch-in before it no longer blocks a new punch-in. */
export const OPEN_SHIFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function openShiftCutoffMs(nowMs = Date.now()) {
  return nowMs - OPEN_SHIFT_MAX_AGE_MS;
}

export async function getEmployeeByUserId(
  userId: string,
  companyId?: string,
  databases = createAdminClient().databases,
): Promise<EmployeeMembership | null> {
  const queries = [Query.equal('userId', userId), Query.equal('status', 'active'), Query.limit(20)];
  if (companyId) queries.unshift(Query.equal('companyId', companyId));
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    queries,
  );
  if (result.total === 0) return null;
  return mapEmployee(result.documents[0] as unknown as Record<string, unknown>);
}

async function loadSitesForEmployee(
  employee: EmployeeMembership,
  databases: Databases,
): Promise<Site[]> {
  const ids = [employee.primarySiteId, ...employee.alternateSiteIds].filter(Boolean);
  if (ids.length === 0) return [];

  const sites = await Promise.all(
    ids.map(async (id) => {
      try {
        const doc = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.sitesCollectionId,
          id,
        );
        const site = mapSite(doc as unknown as Record<string, unknown>);
        if (site.companyId === employee.companyId && site.status === 'active') {
          return site;
        }
      } catch {
        /* skip missing */
      }
      return null;
    }),
  );

  return sites.filter((site): site is Site => site != null);
}

function pickBestSite(lat: number, lon: number, sites: Site[]) {
  let best: { site: Site; distance: number; inside: boolean } | null = null;
  for (const site of sites) {
    const result = isInsideGeofence(lat, lon, site.lat, site.long, site.radiusMeters);
    if (!best || result.distance < best.distance) {
      best = { site, distance: result.distance, inside: result.inside };
    }
  }
  return best;
}

async function getShiftById(
  companyId: string,
  shiftId: string,
  databases: Databases,
): Promise<WorkShift | null> {
  if (!shiftId) return null;
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      shiftId,
    );
    const shift = mapWorkShift(doc as unknown as Record<string, unknown>);
    if (shift.companyId !== companyId || shift.status !== 'active') return null;
    return shift;
  } catch {
    return null;
  }
}

async function getShiftsByIds(
  companyId: string,
  shiftIds: string[],
  databases: Databases,
): Promise<Map<string, WorkShift>> {
  const uniqueIds = [...new Set(shiftIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const shifts = await Promise.all(
    uniqueIds.map((shiftId) => getShiftById(companyId, shiftId, databases)),
  );

  const byId = new Map<string, WorkShift>();
  for (const shift of shifts) {
    if (shift) byId.set(shift.id, shift);
  }
  return byId;
}

async function loadDefaultShift(
  employee: EmployeeMembership,
  lateGraceMinutes: number,
  databases: Databases,
): Promise<WorkShift> {
  const fromId = await getShiftById(employee.companyId, employee.shiftId, databases);
  if (fromId) return fromId;
  return shiftFromEmployeeFallback({
    companyId: employee.companyId,
    startTime: employee.workShiftStart,
    endTime: employee.workShiftEnd,
    lateGraceMinutes,
  }) as WorkShift;
}

async function listAssignmentsForDates(
  employee: EmployeeMembership,
  dateIsos: string[],
  databases: Databases,
): Promise<EmployeeShiftAssignment[]> {
  if (dateIsos.length === 0) return [];
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      [
        Query.equal('companyId', employee.companyId),
        Query.equal('employeeId', employee.id),
        Query.equal('dateIso', dateIsos),
        Query.equal('status', 'scheduled'),
        Query.orderAsc('sequence'),
        Query.limit(50),
      ],
    );
    return result.documents.map((d) =>
      mapShiftAssignment(d as unknown as Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

type ResolvedShiftCandidate = {
  shift: WorkShift;
  sequence: number;
  occurrence: ShiftOccurrence;
};

async function resolvePunchInCandidate(
  employee: EmployeeMembership,
  nowMs: number,
  timeZone: string,
  lateGraceMinutes: number,
  databases: Databases,
): Promise<ResolvedShiftCandidate | null> {
  const dates = candidateShiftDates(nowMs, timeZone);
  const assignments = await listAssignmentsForDates(employee, dates, databases);
  const candidates: ResolvedShiftCandidate[] = [];

  if (assignments.length > 0) {
    const shiftsById = await getShiftsByIds(
      employee.companyId,
      assignments.map((assignment) => assignment.shiftId),
      databases,
    );
    for (const assignment of assignments) {
      const shift = shiftsById.get(assignment.shiftId);
      if (!shift) continue;
      const occurrence = buildShiftOccurrence(shift, assignment.dateIso, timeZone);
      if (
        nowMs >= occurrence.punchInWindowStartMs &&
        nowMs <= occurrence.punchInWindowEndMs
      ) {
        candidates.push({
          shift,
          sequence: assignment.sequence,
          occurrence,
        });
      }
    }
  }

  if (candidates.length === 0) {
    const fallback = await loadDefaultShift(employee, lateGraceMinutes, databases);
    const occurrence = resolvePunchInOccurrence(fallback, nowMs, timeZone);
    if (occurrence) {
      candidates.push({ shift: fallback, sequence: 1, occurrence });
    }
  }

  candidates.sort((a, b) => b.occurrence.scheduledStartMs - a.occurrence.scheduledStartMs);
  return candidates[0] ?? null;
}

async function findAttendanceForShift(
  employee: EmployeeMembership,
  shiftDateIso: string,
  shiftId: string,
  sequence: number,
  databases: Databases,
) {
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    [
      Query.equal('companyId', employee.companyId),
      Query.equal('employeeId', employee.id),
      Query.equal('dateIso', shiftDateIso),
      Query.limit(20),
    ],
  );
  return (
    result.documents.find((doc) => {
      const sameShift = String(doc.shiftId || '') === String(shiftId || '');
      const sameSeq = Number(doc.assignmentSequence || 1) === sequence;
      return sameShift && sameSeq;
    }) ??
    (sequence === 1 && !shiftId
      ? result.documents.find((doc) => !doc.shiftId || Number(doc.assignmentSequence || 1) === 1)
      : null) ??
    null
  );
}

async function findOpenSegment(employee: EmployeeMembership, databases: Databases) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.punchSegmentsCollectionId,
      [
        Query.equal('companyId', employee.companyId),
        Query.equal('employeeId', employee.id),
        Query.equal('isOpen', true),
        Query.orderDesc('clockInTimestamp'),
        Query.limit(5),
      ],
    );
    const cutoff = openShiftCutoffMs();
    const doc = result.documents.find(
      (row) => Number(row.clockInTimestamp || 0) >= cutoff,
    );
    return doc ? mapPunchSegment(doc as unknown as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function findOpenAttendanceRecord(
  employee: EmployeeMembership,
  databases: Databases,
) {
  const cutoff = openShiftCutoffMs();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    [
      Query.equal('companyId', employee.companyId),
      Query.equal('employeeId', employee.id),
      Query.orderDesc('clockInTimestamp'),
      Query.limit(5),
    ],
  );
  const doc =
    result.documents.find((row) => {
      const clockIn = Boolean(row.clockInTime);
      const clockOut = Boolean(row.clockOutTime);
      const inTs = Number(row.clockInTimestamp || 0);
      return clockIn && !clockOut && inTs >= cutoff;
    }) ?? null;
  return doc ? mapAttendance(doc as Record<string, unknown>) : null;
}

/** Close open punch segments after HR regularization so punch-in is unblocked. */
export async function closeOpenSegmentsForRegularization(
  databases: Databases,
  input: {
    companyId: string;
    employeeId: string;
    attendanceId?: string;
    dateIso: string;
    clockOutTime?: string;
    clockOutTimestamp?: number;
  },
) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.punchSegmentsCollectionId,
      [
        Query.equal('companyId', input.companyId),
        Query.equal('employeeId', input.employeeId),
        Query.equal('isOpen', true),
        Query.limit(20),
      ],
    );
    const openDocs = result.documents.filter((row) => {
      if (input.attendanceId) {
        return String(row.attendanceId || '') === input.attendanceId;
      }
      return String(row.dateIso || '') === input.dateIso;
    });
    await Promise.all(
      openDocs.map((row) =>
        databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.punchSegmentsCollectionId,
          row.$id,
          {
            isOpen: false,
            clockOutTime: input.clockOutTime || row.clockOutTime || undefined,
            clockOutTimestamp:
              input.clockOutTimestamp ??
              (row.clockOutTimestamp != null ? Number(row.clockOutTimestamp) : Date.now()),
          },
        ),
      ),
    );
  } catch {
    // Segments collection may not exist yet.
  }
}

async function listSegments(
  attendanceId: string,
  databases: Databases,
): Promise<AttendancePunchSegment[]> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.punchSegmentsCollectionId,
      [
        Query.equal('attendanceId', attendanceId),
        Query.orderAsc('segmentIndex'),
        Query.limit(50),
      ],
    );
    return result.documents.map((d) =>
      mapPunchSegment(d as unknown as Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

function sumSegmentMinutes(segments: AttendancePunchSegment[]) {
  return segments.reduce((sum, segment) => {
    if (!segment.clockInTimestamp || !segment.clockOutTimestamp) return sum;
    return (
      sum +
      Math.max(
        0,
        Math.round((segment.clockOutTimestamp - segment.clockInTimestamp) / 60_000),
      )
    );
  }, 0);
}

async function createSegment(
  input: {
    companyId: string;
    attendanceId: string;
    employeeId: string;
    dateIso: string;
    segmentIndex: number;
    clockInTime: string;
    clockInTimestamp: number;
    siteId: string;
    deviceId: string;
    lat: number;
    long: number;
    teamId: string;
  },
  databases: Databases,
) {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.punchSegmentsCollectionId,
    ID.unique(),
    {
      companyId: input.companyId,
      attendanceId: input.attendanceId,
      employeeId: input.employeeId,
      dateIso: input.dateIso,
      segmentIndex: input.segmentIndex,
      clockInTime: input.clockInTime,
      clockInTimestamp: input.clockInTimestamp,
      clockOutTime: undefined,
      clockOutTimestamp: undefined,
      siteId: input.siteId,
      deviceId: input.deviceId,
      isOpen: true,
      punchInLat: input.lat,
      punchInLong: input.long,
    },
    employeeDocumentPermissions(input.teamId),
  );
}

function resolvePunchLocation(
  employee: EmployeeMembership,
  lat: number,
  lon: number,
  sites: Site[],
): {
  siteId: string;
  locationName: string;
  geofenceStatus: 'INSIDE' | 'GPS_ONLY';
  distanceMeters: number;
} {
  const policy = employee.attendancePolicy || 'geofenced';

  if (policy === 'manual') {
    throw new Error(
      'Self punch is disabled for your account. Contact HR to mark attendance.',
    );
  }

  if (policy === 'gps_logged') {
    const match = sites.length > 0 ? pickBestSite(lat, lon, sites) : null;
    return {
      siteId: match?.site.id || employee.primarySiteId || '',
      locationName: match?.inside
        ? match.site.name
        : match?.site
          ? `Field (${Math.round(match.distance)}m from ${match.site.name})`
          : 'Field (GPS logged)',
      geofenceStatus: 'GPS_ONLY',
      distanceMeters: match ? Math.round(match.distance) : 0,
    };
  }

  if (sites.length === 0) {
    throw new Error('No active site assigned. Ask HR to assign a geofence site.');
  }

  const match = pickBestSite(lat, lon, sites);
  if (!match) {
    throw new Error('Unable to evaluate geofence.');
  }
  if (!match.inside) {
    throw new Error(
      `Outside geofence (${Math.round(match.distance)}m from ${match.site.name}).`,
    );
  }

  return {
    siteId: match.site.id,
    locationName: match.site.name,
    geofenceStatus: 'INSIDE',
    distanceMeters: Math.round(match.distance),
  };
}

export async function processPunch(input: {
  userId: string;
  companyId: string;
  employee?: EmployeeMembership;
  type: 'in' | 'out';
  lat: number;
  long: number;
  accuracy?: number;
  deviceId?: string;
  timezone?: string;
  graceMinutes?: number;
}): Promise<{ record: AttendanceRecord; message: string }> {
  const { databases } = createAdminClient();
  const employee =
    input.employee ??
    (await getEmployeeByUserId(input.userId, input.companyId, databases));
  if (!employee) {
    throw new Error('Employee membership not found.');
  }

  const tz = input.timezone || 'Asia/Kolkata';
  const nowMs = Date.now();
  const companyGrace = input.graceMinutes ?? appwriteConfig.lateGraceMinutes;
  const perms = employeeDocumentPermissions(employee.teamId);

  const sitesPromise = loadSitesForEmployee(employee, databases);
  const openSegmentPromise = findOpenSegment(employee, databases);
  const openAttendancePromise =
    input.type === 'in'
      ? findOpenAttendanceRecord(employee, databases)
      : Promise.resolve(null);
  const punchInCandidatePromise =
    input.type === 'in'
      ? resolvePunchInCandidate(employee, nowMs, tz, companyGrace, databases)
      : Promise.resolve(null);

  const [sites, openSegment, openAttendance, punchInCandidate] = await Promise.all([
    sitesPromise,
    openSegmentPromise,
    openAttendancePromise,
    punchInCandidatePromise,
  ]);

  const punchLocation = resolvePunchLocation(employee, input.lat, input.long, sites);

  if (input.type === 'in') {
    if (openSegment) {
      throw new Error(
        `Already punched in (segment ${openSegment.segmentIndex + 1} on ${openSegment.dateIso}). Punch out first.`,
      );
    }
    if (openAttendance) {
      throw new Error(
        `Already punched in on ${openAttendance.dateIso}. Punch out first.`,
      );
    }

    const candidate = punchInCandidate;
    if (!candidate) {
      throw new Error(
        'Outside punch-in window for all assigned / default shifts. Check roster or shift hours.',
      );
    }

    const { shift, sequence, occurrence } = candidate;
    const status = computePunchInStatus(nowMs, occurrence);
    const clockTime = hhMmFromTimestamp(nowMs, tz);
    let existing = await findAttendanceForShift(
      employee,
      occurrence.shiftDateIso,
      shift.id,
      sequence,
      databases,
    );

    const basePayload = {
      companyId: employee.companyId,
      employeeId: employee.id,
      userId: employee.userId,
      dateIso: occurrence.shiftDateIso,
      dayOfWeek: occurrence.dayOfWeek,
      formattedDate: occurrence.shiftDateIso,
      shiftId: shift.id || '',
      assignmentSequence: sequence,
      isOvernight: occurrence.isOvernight,
      scheduledStartTimestamp: occurrence.scheduledStartMs,
      scheduledEndTimestamp: occurrence.scheduledEndMs,
      status: existing?.clockInTime ? String(existing.status || status) : status,
      siteId: punchLocation.siteId,
      geofenceStatus: punchLocation.geofenceStatus,
      distanceMeters: punchLocation.distanceMeters,
      punchInLat: input.lat,
      punchInLong: input.long,
      punchInAccuracy: input.accuracy ?? 0,
      deviceId: input.deviceId || '',
      note: occurrence.isOvernight ? 'Overnight / cross-midnight shift' : '',
      locationName: punchLocation.locationName,
      earlyDeparture: false,
      overtimeMinutes: 0,
    };

    let attendanceDoc: Record<string, unknown>;
    let segmentIndex = 0;

    if (!existing) {
      attendanceDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        ID.unique(),
        {
          ...basePayload,
          clockInTime: clockTime,
          clockInTimestamp: nowMs,
          clockOutTime: undefined,
          clockOutTimestamp: undefined,
          totalMinutes: 0,
          segmentCount: 1,
        },
        perms,
      );
    } else {
      const segments = await listSegments(existing.$id, databases);
      if (existing.clockInTime && !existing.clockOutTime) {
        if (segments.length === 0 || segments.some((segment) => segment.isOpen)) {
          throw new Error(`Already punched in for shift date ${occurrence.shiftDateIso}.`);
        }
      }

      segmentIndex = segments.length;
      const isFirst = segments.length === 0 && !existing.clockInTime;
      attendanceDoc = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        existing.$id,
        {
          ...basePayload,
          clockInTime: isFirst ? clockTime : existing.clockInTime || clockTime,
          clockInTimestamp: isFirst
            ? nowMs
            : Number(existing.clockInTimestamp || nowMs),
          clockOutTime: undefined,
          clockOutTimestamp: undefined,
          segmentCount: Math.max(1, segments.length + 1),
        },
      );
    }

    try {
      await createSegment(
        {
          companyId: employee.companyId,
          attendanceId: String(attendanceDoc.$id),
          employeeId: employee.id,
          dateIso: occurrence.shiftDateIso,
          segmentIndex,
          clockInTime: clockTime,
          clockInTimestamp: nowMs,
          siteId: punchLocation.siteId,
          deviceId: input.deviceId || '',
          lat: input.lat,
          long: input.long,
          teamId: employee.teamId,
        },
        databases,
      );
    } catch {
      // Segments collection may not exist yet — parent row still works.
    }

    const record = mapAttendance(attendanceDoc as Record<string, unknown>);
    const segmentLabel = segmentIndex > 0 ? ` (segment ${segmentIndex + 1})` : '';
    return {
      record,
      message:
        status === 'LATE'
          ? `Punched in late for shift ${occurrence.shiftDateIso}${segmentLabel}.`
          : `Punched in for shift ${occurrence.shiftDateIso}${segmentLabel}.`,
    };
  }

  // ——— punch out ———
  let attendanceDoc =
    openSegment
      ? await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.attendanceCollectionId,
          openSegment.attendanceId,
        )
      : null;

  if (!attendanceDoc) {
    const legacy = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', employee.companyId),
        Query.equal('employeeId', employee.id),
        Query.orderDesc('clockInTimestamp'),
        Query.limit(5),
      ],
    );
    const cutoff = openShiftCutoffMs();
    attendanceDoc =
      legacy.documents.find((doc) => {
        const clockIn = Boolean(doc.clockInTime);
        const clockOut = Boolean(doc.clockOutTime);
        const inTs = Number(doc.clockInTimestamp || 0);
        return clockIn && !clockOut && inTs >= cutoff;
      }) ?? null;
  }

  if (!attendanceDoc?.clockInTime && !openSegment) {
    throw new Error('Punch in first before punching out.');
  }

  const attendance = mapAttendance(attendanceDoc as Record<string, unknown>);
  const shiftDateIso = attendance.dateIso;
  const shift =
    (await getShiftById(employee.companyId, attendance.shiftId, databases)) ||
    (await loadDefaultShift(employee, companyGrace, databases));
  const occurrence = resolvePunchOutOccurrence(shift, shiftDateIso, tz);

  if (
    nowMs < occurrence.punchOutWindowStartMs ||
    nowMs > occurrence.punchOutWindowEndMs
  ) {
    const softEnd =
      Number(openSegment?.clockInTimestamp || attendance.clockInTimestamp || nowMs) +
      20 * 60 * 60 * 1000;
    if (nowMs > softEnd && nowMs > occurrence.punchOutWindowEndMs) {
      throw new Error(
        `Outside punch-out window for shift date ${shiftDateIso}. Request regularization if needed.`,
      );
    }
  }

  const clockOutTime = hhMmFromTimestamp(nowMs, tz);
  const { dateIso: punchOutDate } = dateIsoInTimeZone(nowMs, tz);

  if (openSegment) {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.punchSegmentsCollectionId,
      openSegment.id,
      {
        clockOutTime,
        clockOutTimestamp: nowMs,
        isOpen: false,
        punchOutLat: input.lat,
        punchOutLong: input.long,
        siteId: punchLocation.siteId,
        deviceId: input.deviceId || openSegment.deviceId || '',
      },
    );
  }

  const segments = await listSegments(attendance.id, databases);
  const closed = segments.filter((segment) => segment.clockInTimestamp && segment.clockOutTimestamp);
  const hasOpen = segments.some((segment) => segment.isOpen);
  const firstIn = segments[0]?.clockInTimestamp || attendance.clockInTimestamp || nowMs;
  const lastOut = hasOpen
    ? null
    : closed.length > 0
      ? Math.max(...closed.map((segment) => segment.clockOutTimestamp!))
      : nowMs;
  const totalFromSegments =
    closed.length > 0
      ? sumSegmentMinutes(closed)
      : Math.max(0, Math.round((nowMs - Number(firstIn)) / 60_000));

  const finalized = finalizeAttendanceOnPunchOut({
    punchInStatus: attendance.status,
    clockInTimestamp: Number(firstIn),
    clockOutTimestamp: lastOut || nowMs,
    occurrence,
  });
  const totalMinutes =
    closed.length > 1 ? totalFromSegments : finalized.totalMinutes;

  const doc = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    attendance.id,
    {
      clockOutTime: hasOpen ? undefined : clockOutTime,
      clockOutTimestamp: hasOpen ? undefined : lastOut || nowMs,
      totalMinutes: hasOpen ? totalFromSegments : totalMinutes,
      earlyDeparture: hasOpen ? false : finalized.earlyDeparture,
      overtimeMinutes: hasOpen ? 0 : finalized.overtimeMinutes,
      status: hasOpen ? attendance.status : finalized.status,
      isOvernight: occurrence.isOvernight || punchOutDate !== shiftDateIso,
      scheduledStartTimestamp:
        attendance.scheduledStartTimestamp || occurrence.scheduledStartMs,
      scheduledEndTimestamp:
        attendance.scheduledEndTimestamp || occurrence.scheduledEndMs,
      shiftId: attendance.shiftId || shift.id || '',
      assignmentSequence: attendance.assignmentSequence || 1,
      segmentCount: Math.max(segments.length, 1),
      punchOutLat: input.lat,
      punchOutLong: input.long,
      punchOutAccuracy: input.accuracy ?? 0,
      distanceMeters: punchLocation.distanceMeters,
      siteId: punchLocation.siteId,
      locationName: punchLocation.locationName,
      geofenceStatus: punchLocation.geofenceStatus,
      deviceId: input.deviceId || attendance.deviceId || '',
      note:
        punchOutDate !== shiftDateIso
          ? `Cross-day punch-out on ${punchOutDate} for shift ${shiftDateIso}`
          : attendance.note || '',
    },
  );

  const extras = [
    !hasOpen && finalized.earlyDeparture ? 'early departure' : null,
    !hasOpen && finalized.overtimeMinutes > 0
      ? `${finalized.overtimeMinutes}m OT`
      : null,
    segments.length > 1 ? `${segments.length} segments` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    record: mapAttendance(doc as Record<string, unknown>),
    message: extras
      ? `Punched out for shift ${shiftDateIso} (${extras}).`
      : `Punched out for shift ${shiftDateIso}.`,
  };
}
