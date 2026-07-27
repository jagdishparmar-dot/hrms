import type { AttendanceRecord } from "@/lib/appwrite/types";

export type DashboardLeaveItem = {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
};

export type DashboardRegularizationItem = {
  id: string;
  employeeName: string;
  dateIso: string;
  requestedClockIn: string;
  requestedClockOut: string;
  requestedOutDateIso: string;
  reason: string;
};

export type DashboardShiftChangeItem = {
  id: string;
  employeeName: string;
  dateIso: string;
  sequence: number;
  currentShiftLabel: string;
  requestedShiftLabel: string;
  reason: string;
};

export type DashboardAdminQueues = {
  regularizationsPending: number;
  regularizationItems: DashboardRegularizationItem[];
  shiftChangesPending: number;
  shiftChangeItems: DashboardShiftChangeItem[];
};

export type DashboardOnDutyItem = {
  employeeId: string;
  employeeName: string;
  clockInTime: string;
  siteName: string;
  status: string;
  geofenceStatus: string;
};

export type DashboardSnapshot = {
  today: string;
  employees: {
    active: number;
    inactive: number;
    invited: number;
    byType: Record<string, number>;
  };
  attendance: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    halfDay: number;
    openShifts: number;
    marked: number;
    unmarked: number;
  };
  leave: {
    pending: number;
    onLeaveToday: number;
    pendingItems: DashboardLeaveItem[];
    onLeaveTodayItems: DashboardLeaveItem[];
  };
  regularizationsPending: number;
  adminQueues: DashboardAdminQueues | null;
  onDutyNow: DashboardOnDutyItem[];
  recent: AttendanceRecord[];
};

export function attendanceStatusTone(status: string) {
  switch (status) {
    case "PRESENT":
      return "emerald";
    case "LATE":
      return "amber";
    case "ABSENT":
      return "rose";
    case "ON_LEAVE":
    case "LEAVE_PENDING":
      return "sky";
    case "HALF_DAY":
      return "indigo";
    default:
      return "muted";
  }
}

export function attendanceStatusClass(status: string) {
  const tone = attendanceStatusTone(status);
  const map = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    indigo:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
    muted: "border-border bg-muted text-muted-foreground",
  } as const;
  return map[tone];
}
