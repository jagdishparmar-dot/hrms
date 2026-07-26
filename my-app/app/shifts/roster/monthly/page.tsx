import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ShiftRosterMonthlyGrid } from "@/components/shift-roster-monthly-grid";
import { Button } from "@/components/ui/button";
import {
  currentRegisterMonth,
  SHIFT_ROSTER_REGISTER_PAGE_SIZE,
  SHIFT_ROSTER_REGISTER_PAGE_SIZE_OPTIONS,
} from "@/lib/shift-roster-register";
import {
  getShiftRosterRegisterAction,
  listShiftsAction,
} from "@/lib/appwrite/phase1-actions";
import { resolvePageSize } from "@/lib/pagination-ui";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Monthly shift roster",
  description: "Monthly shift roster matrix with employee code, designation, and shift codes by date.",
  path: "/shifts/roster/monthly",
});

export default async function ShiftRosterMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    q?: string;
    department?: string;
    branch?: string;
    designation?: string;
    sort?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month || "")
    ? params.month!
    : currentRegisterMonth();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = resolvePageSize(
    params.size,
    SHIFT_ROSTER_REGISTER_PAGE_SIZE_OPTIONS,
    SHIFT_ROSTER_REGISTER_PAGE_SIZE,
  );
  const sort = params.sort === "name" ? "name" : "code";

  const filters = {
    month,
    search: params.q || "",
    department: params.department || "",
    branch: params.branch || "",
    designation: params.designation || "",
    sort: sort as "code" | "name",
  };

  const [register, shifts] = await Promise.all([
    getShiftRosterRegisterAction({
      month,
      page,
      pageSize,
      search: filters.search || undefined,
      department: filters.department || undefined,
      branch: filters.branch || undefined,
      designation: filters.designation || undefined,
      sort,
    }),
    listShiftsAction(),
  ]);

  return (
    <AdminShell
      title="Monthly shift roster"
      subtitle="Employee × day shift code matrix from scheduled roster assignments"
    >
      <PageHeader
        title="Monthly shift roster"
        description="View scheduled shift codes by employee and calendar date. Multi-shift days appear as DAY+NIGHT."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/shifts/roster" />}
            >
              Assignments
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/shifts" />}
            >
              Shift catalog
            </Button>
          </div>
        }
      />
      <ShiftRosterMonthlyGrid
        register={register}
        filters={filters}
        filterOptions={{
          departments: register.departments,
          designations: register.designations,
          branches: register.branches,
        }}
        shifts={shifts}
      />
    </AdminShell>
  );
}
