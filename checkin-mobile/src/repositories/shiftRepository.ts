import { AppwriteConfig } from '@/src/config/appwrite';
import { authorizedFetch } from '@/src/services/apiClient';
import type {
  ShiftCatalogItem,
  ShiftChangeRequest,
  TodayShiftInfo,
  TodayShiftSchedule,
} from '@/src/types';

const EMPTY_SCHEDULE: TodayShiftSchedule = {
  dateIso: '',
  timezone: '',
  shifts: [],
};

export async function fetchTodayShiftSchedule(
  companyId: string | null,
): Promise<TodayShiftSchedule> {
  if (!companyId) return EMPTY_SCHEDULE;

  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/shifts/today`, {
    companyId,
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

export async function fetchShiftCatalog(companyId: string | null): Promise<ShiftCatalogItem[]> {
  if (!companyId) return [];

  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/shifts/catalog`, {
    companyId,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load shifts');
  }

  return Array.isArray(data.shifts) ? (data.shifts as ShiftCatalogItem[]) : [];
}

export async function submitShiftChangeRequest(
  companyId: string | null,
  payload: {
    dateIso: string;
    requestedShiftId: string;
    reason: string;
    sequence?: number;
  },
) {
  if (!companyId) throw new Error('Company not selected');

  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/shifts/change-request`, {
    method: 'POST',
    companyId,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Shift change request failed');
  return true;
}

export async function listShiftChangeRequests(
  companyId: string | null,
): Promise<ShiftChangeRequest[]> {
  if (!companyId) return [];

  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/shifts/change-request`, {
    companyId,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load shift change requests');
  return (data.requests ?? []) as ShiftChangeRequest[];
}
