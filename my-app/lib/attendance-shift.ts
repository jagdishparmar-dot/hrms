import type { AttendanceStatus, WorkShift } from '@/lib/appwrite/types';

export type { WorkShift };
export type ShiftType = WorkShift['shiftType'];

export type ShiftOccurrence = {
  shift: WorkShift;
  /** Business/shift date (date of scheduled start), not punch calendar day. */
  shiftDateIso: string;
  dayOfWeek: string;
  scheduledStartMs: number;
  scheduledEndMs: number;
  punchInWindowStartMs: number;
  punchInWindowEndMs: number;
  punchOutWindowStartMs: number;
  punchOutWindowEndMs: number;
  isOvernight: boolean;
};

export type PunchFinalizeResult = {
  status: AttendanceStatus;
  earlyDeparture: boolean;
  overtimeMinutes: number;
  totalMinutes: number;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function minutesFromHhMm(value: string) {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function hhMmFromTimestamp(timestamp: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
  );
  return `${parts.hour}:${parts.minute}`;
}

export function dateIsoInTimeZone(timestamp: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
  );
  return {
    dateIso: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: parts.weekday || '',
  };
}

export function addDaysIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Convert a wall-clock date+time in `timeZone` to UTC epoch ms. */
export function zonedDateTimeToUtcMs(
  dateIso: string,
  timeHhMm: string,
  timeZone: string,
): number {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = timeHhMm.split(':').map(Number);
  let utc = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0);

  for (let i = 0; i < 4; i += 1) {
    const parts = dateIsoInTimeZone(utc, timeZone);
    const clock = hhMmFromTimestamp(utc, timeZone);
    const [gotH, gotM] = clock.split(':').map(Number);
    const [gotY, gotMo, gotD] = parts.dateIso.split('-').map(Number);
    const asUtc = Date.UTC(gotY!, gotMo! - 1, gotD!, gotH!, gotM!, 0, 0);
    const wanted = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0);
    const delta = wanted - asUtc;
    if (delta === 0) break;
    utc += delta;
  }

  return utc;
}

export function inferCrossesMidnight(startTime: string, endTime: string) {
  return minutesFromHhMm(endTime) <= minutesFromHhMm(startTime);
}

export function inferShiftType(startTime: string, endTime: string): ShiftType {
  if (inferCrossesMidnight(startTime, endTime)) return 'cross_midnight';
  const start = minutesFromHhMm(startTime);
  if (start >= 16 * 60) return 'evening';
  if (start >= 20 * 60 || start < 5 * 60) return 'night';
  return 'general';
}

export function shiftFromEmployeeFallback(input: {
  companyId: string;
  startTime: string;
  endTime: string;
  lateGraceMinutes: number;
}): WorkShift {
  const startTime = input.startTime || '09:00';
  const endTime = input.endTime || '18:00';
  const crossesMidnight = inferCrossesMidnight(startTime, endTime);
  const span =
    (minutesFromHhMm(endTime) - minutesFromHhMm(startTime) + (crossesMidnight ? 24 * 60 : 0) +
      24 * 60) %
      (24 * 60) || 8 * 60;

  return {
    id: '',
    companyId: input.companyId,
    name: 'Assigned hours',
    code: 'DEFAULT',
    shiftType: inferShiftType(startTime, endTime),
    startTime,
    endTime,
    crossesMidnight,
    punchInBeforeMinutes: 120,
    punchInAfterMinutes: 240,
    punchOutBeforeMinutes: 120,
    punchOutAfterMinutes: 240,
    lateGraceMinutes: input.lateGraceMinutes,
    earlyLeaveGraceMinutes: input.lateGraceMinutes,
    fullDayMinutes: span,
    halfDayMinutes: Math.max(60, Math.floor(span / 2)),
    overtimeAfterMinutes: span,
    status: 'active',
  };
}

export function buildShiftOccurrence(
  shift: WorkShift,
  shiftDateIso: string,
  timeZone: string,
): ShiftOccurrence {
  const crossesMidnight =
    shift.crossesMidnight || inferCrossesMidnight(shift.startTime, shift.endTime);
  const scheduledStartMs = zonedDateTimeToUtcMs(shiftDateIso, shift.startTime, timeZone);
  const endDateIso = crossesMidnight ? addDaysIso(shiftDateIso, 1) : shiftDateIso;
  const scheduledEndMs = zonedDateTimeToUtcMs(endDateIso, shift.endTime, timeZone);
  const { dayOfWeek } = dateIsoInTimeZone(scheduledStartMs, timeZone);

  return {
    shift,
    shiftDateIso,
    dayOfWeek,
    scheduledStartMs,
    scheduledEndMs,
    punchInWindowStartMs:
      scheduledStartMs - shift.punchInBeforeMinutes * 60_000,
    punchInWindowEndMs: scheduledStartMs + shift.punchInAfterMinutes * 60_000,
    punchOutWindowStartMs:
      scheduledEndMs - shift.punchOutBeforeMinutes * 60_000,
    punchOutWindowEndMs: scheduledEndMs + shift.punchOutAfterMinutes * 60_000,
    isOvernight: crossesMidnight,
  };
}

/** Candidate shift dates that could be active around `nowMs` (today and yesterday in TZ). */
export function candidateShiftDates(nowMs: number, timeZone: string) {
  const today = dateIsoInTimeZone(nowMs, timeZone).dateIso;
  return [today, addDaysIso(today, -1)];
}

export function resolvePunchInOccurrence(
  shift: WorkShift,
  nowMs: number,
  timeZone: string,
): ShiftOccurrence | null {
  const candidates = candidateShiftDates(nowMs, timeZone)
    .map((dateIso) => buildShiftOccurrence(shift, dateIso, timeZone))
    .filter(
      (occurrence) =>
        nowMs >= occurrence.punchInWindowStartMs &&
        nowMs <= occurrence.punchInWindowEndMs,
    )
    .sort((a, b) => b.scheduledStartMs - a.scheduledStartMs);

  return candidates[0] ?? null;
}

export function resolvePunchOutOccurrence(
  shift: WorkShift,
  shiftDateIso: string,
  timeZone: string,
): ShiftOccurrence {
  return buildShiftOccurrence(shift, shiftDateIso, timeZone);
}

export function computePunchInStatus(
  nowMs: number,
  occurrence: ShiftOccurrence,
): AttendanceStatus {
  const graceMs = occurrence.shift.lateGraceMinutes * 60_000;
  if (nowMs > occurrence.scheduledStartMs + graceMs) return 'LATE';
  return 'PRESENT';
}

export function finalizeAttendanceOnPunchOut(input: {
  punchInStatus: AttendanceStatus;
  clockInTimestamp: number;
  clockOutTimestamp: number;
  occurrence: ShiftOccurrence;
}): PunchFinalizeResult {
  const totalMinutes = Math.max(
    0,
    Math.round((input.clockOutTimestamp - input.clockInTimestamp) / 60_000),
  );
  const { shift, scheduledEndMs } = input.occurrence;
  const earlyDeparture =
    input.clockOutTimestamp < scheduledEndMs - shift.earlyLeaveGraceMinutes * 60_000;
  const overtimeMinutes = Math.max(0, totalMinutes - shift.overtimeAfterMinutes);

  let status: AttendanceStatus = input.punchInStatus;
  if (status === 'ON_LEAVE' || status === 'LEAVE_PENDING' || status === 'ABSENT') {
    status = 'PRESENT';
  }
  if (totalMinutes < shift.halfDayMinutes) {
    status = 'HALF_DAY';
  } else if (status !== 'LATE') {
    status = 'PRESENT';
  }

  return {
    status,
    earlyDeparture,
    overtimeMinutes,
    totalMinutes,
  };
}

export function formatShiftWindowLabel(shift: Pick<WorkShift, 'startTime' | 'endTime' | 'crossesMidnight'>) {
  const overnight =
    shift.crossesMidnight || inferCrossesMidnight(shift.startTime, shift.endTime);
  return overnight
    ? `${shift.startTime} – ${shift.endTime} (+1 day)`
    : `${shift.startTime} – ${shift.endTime}`;
}
