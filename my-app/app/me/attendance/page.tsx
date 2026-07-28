import { redirect } from 'next/navigation';

import { EmployeeAttendanceView } from '@/components/employee-attendance-view';
import { requireTenantMember } from '@/lib/appwrite/auth';
import { dateIsoInTimeZone } from '@/lib/attendance-shift';
import {
  getMyTodayShiftsAction,
  listMyAttendanceAction,
  listMyRegularizationsAction,
  listMyShiftChangeRequestsAction,
  listShiftCatalogAction,
} from '@/lib/appwrite/employee-portal-actions';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'My attendance',
  description: 'View your punch history and regularization requests.',
  path: '/me/attendance',
});

export default async function EmployeeAttendancePage() {
  const ctx = await requireTenantMember();
  if (isCompanyAdminRole(ctx.membership.role)) {
    redirect('/attendance');
  }

  const tz = ctx.company.settings.timezone || 'Asia/Kolkata';
  const todayIso = dateIsoInTimeZone(Date.now(), tz).dateIso;

  const [records, regularizations, shiftChangeRequests, schedule, shiftCatalog] =
    await Promise.all([
      listMyAttendanceAction(),
      listMyRegularizationsAction(),
      listMyShiftChangeRequestsAction(),
      getMyTodayShiftsAction(),
      listShiftCatalogAction(),
    ]);

  return (
    <>
      <div className="mb-4 hidden md:block">
        <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
        <p className="text-sm text-muted-foreground">
          Review punch history, regularize attendance, and request shift changes.
        </p>
      </div>
      <EmployeeAttendanceView
        records={records}
        regularizations={regularizations}
        shiftChangeRequests={shiftChangeRequests}
        todayIso={todayIso}
        schedule={schedule}
        shiftCatalog={shiftCatalog}
      />
    </>
  );
}
