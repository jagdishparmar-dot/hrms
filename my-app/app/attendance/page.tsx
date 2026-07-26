import { AdminShell } from "@/components/admin-shell";
import {
  AttendanceDirectory,
  type AttendanceFilters,
} from "@/components/attendance-directory";
import {
  ATTENDANCE_PAGE_SIZE,
  ATTENDANCE_PAGE_SIZE_OPTIONS,
  resolveAttendanceDateFilters,
} from "@/lib/attendance-list";
import {
  listAttendanceAction,
  listEmployeesAction,
  listRegularizationsAction,
  listSitesAction,
} from "@/lib/appwrite/phase1-actions";
import { resolvePageSize } from "@/lib/pagination-ui";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Attendance",
  description: "Review punch records, regularizations, and daily attendance across your workforce.",
  path: "/attendance",
});

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    from?: string;
    to?: string;
    status?: string;
    userId?: string;
    siteId?: string;
    geofence?: string;
    open?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const params = await searchParams;
  const dates = resolveAttendanceDateFilters({
    from: params.from,
    to: params.to,
    month: params.month,
  });
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = resolvePageSize(
    params.size,
    ATTENDANCE_PAGE_SIZE_OPTIONS,
    ATTENDANCE_PAGE_SIZE,
  );

  const filters: AttendanceFilters = {
    month: dates.month,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    status: params.status || "",
    userId: params.userId || "",
    siteId: params.siteId || "",
    geofenceStatus: params.geofence || "",
    openShiftsOnly: params.open === "1",
  };

  const [{ employees }, sites, attendance, regularizations] = await Promise.all([
    listEmployeesAction(),
    listSitesAction(),
    listAttendanceAction({
      month: filters.dateFrom && filters.dateTo ? undefined : filters.month,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      status: filters.status || undefined,
      userId: filters.userId || undefined,
      siteId: filters.siteId || undefined,
      geofenceStatus: filters.geofenceStatus || undefined,
      openShiftsOnly: filters.openShiftsOnly,
      page,
      pageSize,
    }),
    listRegularizationsAction(),
  ]);

  return (
    <AdminShell title="Attendance" subtitle="Daily punches and regularization queue">
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Attendance</h1>
          <p className="text-muted-foreground text-sm">
            Monitor punches, geofence compliance, open shifts, and export filtered logs.
          </p>
        </div>
        <AttendanceDirectory
          rows={attendance.rows}
          pagination={{
            page: attendance.page,
            pageSize: attendance.pageSize,
            total: attendance.total,
          }}
          employees={employees}
          sites={sites}
          regularizations={regularizations}
          filters={filters}
        />
      </div>
    </AdminShell>
  );
}
