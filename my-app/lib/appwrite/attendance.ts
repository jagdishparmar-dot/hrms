import { ID, Query } from 'node-appwrite';

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

export async function getEmployeeByUserId(
  userId: string,
  companyId?: string,
): Promise<EmployeeMembership | null> {
  const { databases } = createAdminClient();
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

async function loadSitesForEmployee(employee: EmployeeMembership): Promise<Site[]> {
  const { databases } = createAdminClient();
  const ids = [employee.primarySiteId, ...employee.alternateSiteIds].filter(Boolean);
  if (ids.length === 0) return [];

  const sites: Site[] = [];
  for (const id of ids) {
    try {
      const doc = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.sitesCollectionId,
        id,
      );
      const site = mapSite(doc as unknown as Record<string, unknown>);
      if (site.companyId === employee.companyId && site.status === 'active') {
        sites.push(site);
      }
    } catch {
      /* skip missing */
    }
  }
  return sites;
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
): Promise<WorkShift | null> {
  if (!shiftId) return null;
  try {
    const { databases } = createAdminClient();
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

async function loadDefaultShift(
  employee: EmployeeMembership,
  lateGraceMinutes: number,
): Promise<WorkShift> {
  const fromId = await getShiftById(employee.companyId, employee.shiftId);
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
): Promise<EmployeeShiftAssignment[]> {
  if (dateIsos.length === 0) return [];
  const { databases } = createAdminClient();
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
): Promise<ResolvedShiftCandidate | null> {
  const dates = candidateShiftDates(nowMs, timeZone);
  const assignments = await listAssignmentsForDates(employee, dates);
  const candidates: ResolvedShiftCandidate[] = [];

  if (assignments.length > 0) {
    for (const assignment of assignments) {
      const shift = await getShiftById(employee.companyId, assignment.shiftId);
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
    const fallback = await loadDefaultShift(employee, lateGraceMinutes);
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
) {
  const { databases } = createAdminClient();
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
    // Legacy rows without shiftId: only match sequence 1 empty shift
    (sequence === 1 && !shiftId
      ? result.documents.find((doc) => !doc.shiftId || Number(doc.assignmentSequence || 1) === 1)
      : null) ??
    null
  );
}

async function findOpenSegment(employee: EmployeeMembership) {
  const { databases } = createAdminClient();
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
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const doc = result.documents.find(
      (row) => Number(row.clockInTimestamp || 0) >= cutoff,
    );
    return doc ? mapPunchSegment(doc as unknown as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function listSegments(attendanceId: string): Promise<AttendancePunchSegment[]> {
  const { databases } = createAdminClient();
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

async function createSegment(input: {
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
}) {
  const { databases } = createAdminClient();
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

export async function processPunch(input: {
  userId: string;
  companyId: string;
  type: 'in' | 'out';
  lat: number;
  long: number;
  accuracy?: number;
  deviceId?: string;
  timezone?: string;
  graceMinutes?: number;
}): Promise<{ record: AttendanceRecord; message: string }> {
  const employee = await getEmployeeByUserId(input.userId, input.companyId);
  if (!employee) {
    throw new Error('Employee membership not found.');
  }

  const sites = await loadSitesForEmployee(employee);
  if (sites.length === 0) {
    throw new Error('No active site assigned. Ask HR to assign a geofence site.');
  }

  const match = pickBestSite(input.lat, input.long, sites);
  if (!match) {
    throw new Error('Unable to evaluate geofence.');
  }
  if (!match.inside) {
    throw new Error(
      `Outside geofence (${Math.round(match.distance)}m from ${match.site.name}).`,
    );
  }

  const { databases } = createAdminClient();
  const tz = input.timezone || 'Asia/Kolkata';
  const nowMs = Date.now();
  const companyGrace = input.graceMinutes ?? appwriteConfig.lateGraceMinutes;
  const perms = employeeDocumentPermissions(employee.teamId);

  if (input.type === 'in') {
    const openSegment = await findOpenSegment(employee);
    if (openSegment) {
      throw new Error(
        `Already punched in (segment ${openSegment.segmentIndex + 1} on ${openSegment.dateIso}). Punch out first.`,
      );
    }

    const candidate = await resolvePunchInCandidate(employee, nowMs, tz, companyGrace);
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
    );

    // Multi-punch: allow new segment when prior segments are closed.
    if (existing?.clockInTime && !existing.clockOutTime) {
      // Legacy open row without segments — treat as open punch.
      const segs = await listSegments(existing.$id);
      if (segs.length === 0 || segs.some((s) => s.isOpen)) {
        throw new Error(`Already punched in for shift date ${occurrence.shiftDateIso}.`);
      }
    }

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
      siteId: match.site.id,
      geofenceStatus: 'INSIDE' as const,
      distanceMeters: Math.round(match.distance),
      punchInLat: input.lat,
      punchInLong: input.long,
      punchInAccuracy: input.accuracy ?? 0,
      deviceId: input.deviceId || '',
      note: occurrence.isOvernight ? 'Overnight / cross-midnight shift' : '',
      locationName: match.site.name,
      earlyDeparture: false,
      overtimeMinutes: 0,
    };

    let attendanceId: string;
    if (!existing) {
      const created = await databases.createDocument(
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
      attendanceId = created.$id;
      existing = created;
    } else {
      attendanceId = existing.$id;
      const segments = await listSegments(attendanceId);
      const isFirst = segments.length === 0 && !existing.clockInTime;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        attendanceId,
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

    const segments = await listSegments(attendanceId);
    const segmentIndex = segments.length;
    try {
      await createSegment({
        companyId: employee.companyId,
        attendanceId,
        employeeId: employee.id,
        dateIso: occurrence.shiftDateIso,
        segmentIndex,
        clockInTime: clockTime,
        clockInTimestamp: nowMs,
        siteId: match.site.id,
        deviceId: input.deviceId || '',
        lat: input.lat,
        long: input.long,
        teamId: employee.teamId,
      });
    } catch {
      // Segments collection may not exist yet — parent row still works.
    }

    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      attendanceId,
    );
    const record = mapAttendance(doc as unknown as Record<string, unknown>);
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
  let openSegment = await findOpenSegment(employee);
  let attendanceDoc =
    openSegment
      ? await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.attendanceCollectionId,
          openSegment.attendanceId,
        )
      : null;

  // Legacy fallback: open attendance without segments
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
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
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

  const attendance = mapAttendance(attendanceDoc as unknown as Record<string, unknown>);
  const shiftDateIso = attendance.dateIso;
  const shift =
    (await getShiftById(employee.companyId, attendance.shiftId)) ||
    (await loadDefaultShift(employee, companyGrace));
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
        siteId: match.site.id,
        deviceId: input.deviceId || openSegment.deviceId || '',
      },
    );
  }

  const segments = await listSegments(attendance.id);
  const closed = segments.filter((s) => s.clockInTimestamp && s.clockOutTimestamp);
  const hasOpen = segments.some((s) => s.isOpen);
  const firstIn = segments[0]?.clockInTimestamp || attendance.clockInTimestamp || nowMs;
  const lastOut = hasOpen
    ? null
    : closed.length > 0
      ? Math.max(...closed.map((s) => s.clockOutTimestamp!))
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
  // Prefer segment-sum when multi-punch; still use finalize for early/OT/status.
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
      distanceMeters: Math.round(match.distance),
      siteId: match.site.id,
      locationName: match.site.name,
      geofenceStatus: 'INSIDE',
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
    record: mapAttendance(doc as unknown as Record<string, unknown>),
    message: extras
      ? `Punched out for shift ${shiftDateIso} (${extras}).`
      : `Punched out for shift ${shiftDateIso}.`,
  };
}
