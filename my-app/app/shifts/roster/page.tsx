import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ShiftRoster } from "@/components/shift-roster";
import { Button } from "@/components/ui/button";
import {
  listEmployeesAction,
  listShiftAssignmentsAction,
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

  const [assignments, { employees }, shifts] = await Promise.all([
    listShiftAssignmentsAction({ from, to }),
    listEmployeesAction(),
    listShiftsAction(),
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
      <ShiftRoster
        assignments={assignments}
        employees={employees.filter((e) => e.status === "active")}
        shifts={shifts}
      />
    </AdminShell>
  );
}
