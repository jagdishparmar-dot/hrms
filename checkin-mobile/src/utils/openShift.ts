import type { AttendanceRecord } from '@/src/types';

/** Must match server OPEN_SHIFT_MAX_AGE_MS in my-app/lib/appwrite/attendance.ts */
export const OPEN_SHIFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function findOpenAttendanceRecord(
  records: AttendanceRecord[],
  nowMs = Date.now(),
): AttendanceRecord | null {
  const cutoff = nowMs - OPEN_SHIFT_MAX_AGE_MS;
  const openRecords = records.filter(
    (record) =>
      Boolean(record.clockInTime) &&
      record.clockOutTime == null &&
      record.clockInTimestamp >= cutoff,
  );
  if (openRecords.length === 0) return null;
  return openRecords.reduce((latest, record) =>
    record.clockInTimestamp > latest.clockInTimestamp ? record : latest,
  );
}
