import { AppwriteConfig } from '@/src/config/appwrite';
import { authHeaders } from '@/src/services/apiClient';
import type { TodayShiftInfo, TodayShiftSchedule } from '@/src/types';

const EMPTY_SCHEDULE: TodayShiftSchedule = {
  dateIso: '',
  timezone: '',
  shifts: [],
};

export async function fetchTodayShiftSchedule(
  companyId: string | null,
): Promise<TodayShiftSchedule> {
  if (!companyId) return EMPTY_SCHEDULE;

  const headers = await authHeaders(companyId);
  const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/shifts/today`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load today\'s shift');
  }

  return {
    dateIso: String(data.dateIso || ''),
    timezone: String(data.timezone || ''),
    shifts: Array.isArray(data.shifts)
      ? (data.shifts as TodayShiftInfo[]).map((shift) => ({
          assignmentId: shift.assignmentId,
          dateIso: String(shift.dateIso || ''),
          sequence: Number(shift.sequence || 1),
          shiftId: String(shift.shiftId || ''),
          name: String(shift.name || 'Shift'),
          code: String(shift.code || ''),
          shiftType: shift.shiftType || 'general',
          startTime: String(shift.startTime || ''),
          endTime: String(shift.endTime || ''),
          windowLabel: String(shift.windowLabel || ''),
          source: shift.source === 'roster' ? 'roster' : 'default',
          note: shift.note ? String(shift.note) : undefined,
        }))
      : [],
  };
}
