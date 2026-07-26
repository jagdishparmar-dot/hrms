import type { AttendanceRecord } from "@/lib/appwrite/types";

export const ATTENDANCE_PAGE_SIZE = 25;
export const ATTENDANCE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const ATTENDANCE_EXPORT_MAX = 5000;

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export type AttendanceQueryParams = {
  userId?: string;
  status?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  siteId?: string;
  geofenceStatus?: string;
  openShiftsOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type AttendanceListResult = {
  rows: AttendanceRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export function resolveAttendanceDateFilters(params: {
  from?: string;
  to?: string;
  month?: string;
}) {
  const today = todayIsoDate();
  const hasExplicitRange = Boolean(params.from || params.to || params.month);

  if (!hasExplicitRange) {
    return {
      dateFrom: today,
      dateTo: today,
      month: currentMonthValue(),
    };
  }

  return {
    dateFrom: params.from || "",
    dateTo: params.to || "",
    month: params.month || currentMonthValue(),
  };
}
