import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ShiftChangeReview } from "@/components/shift-change-review";
import { ShiftRoster } from "@/components/shift-roster";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  listEmployeesAction,
  listShiftAssignmentsAction,
  listShiftChangeRequestsAction,
  listShiftsAction,
} from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Shift roster",
  description: "Assign employees to shifts and manage roster schedules.",
  path: "/shifts/roster",
});

export default async function ShiftRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = params.from || `${today.slice(0, 7)}-01`;
  const year = Number(from.slice(0, 4));
  const month = Number(from.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  const to =
    params.to ||
    `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [assignments, { employees }, shifts, shiftChangeRequests] = await Promise.all([
    listShiftAssignmentsAction({ from, to }),
    listEmployeesAction(),
    listShiftsAction(),
    listShiftChangeRequestsAction(),
  ]);

  return (
    <AdminShell
      title="Shift roster"
      subtitle="Rotational calendars and multi-shift employee-day assignments"
    >
      <PageHeader
        title="Shift roster"
        description="Assign day/evening/night shifts per employee-date. Punch-in resolves the rostered shift window first."
        actions={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/shifts" />}
          >
            Shift catalog
          </Button>
        }
      />
      {shiftChangeRequests.length > 0 ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">Pending shift change requests</CardTitle>
            <CardDescription>
              Approve to update the employee roster for the requested date. Punch windows follow
              the updated assignment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShiftChangeReview items={shiftChangeRequests} />
          </CardContent>
        </Card>
      ) : null}
      <ShiftRoster
        assignments={assignments}
        employees={employees.filter((e) => e.status === "active")}
        shifts={shifts}
        dateRange={{ from, to }}
      />
    </AdminShell>
  );
}
