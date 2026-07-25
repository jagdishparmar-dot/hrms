import { AttendanceMonthlyGrid } from "@/components/attendance-monthly-grid";
import { AdminShell } from "@/components/admin-shell";
import { currentRegisterMonth } from "@/lib/attendance-register";
import { getAttendanceRegisterAction } from "@/lib/appwrite/phase1-actions";

export default async function AttendanceMonthlyPage({
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
  }>;
}) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month || "")
    ? params.month!
    : currentRegisterMonth();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const sort = params.sort === "name" ? "name" : "code";

  const filters = {
    month,
    search: params.q || "",
    department: params.department || "",
    branch: params.branch || "",
    designation: params.designation || "",
    sort: sort as "code" | "name",
  };

  const register = await getAttendanceRegisterAction({
    month,
    page,
    search: filters.search || undefined,
    department: filters.department || undefined,
    branch: filters.branch || undefined,
    designation: filters.designation || undefined,
    sort,
  });

  return (
    <AdminShell
      title="Monthly register"
      subtitle="Employee × day attendance matrix with leave, holiday, and weekly-off sync"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Monthly attendance</h1>
          <p className="text-muted-foreground text-sm">
            Matrix view with P (Present), AB (Absent), L (Leave), and OFF (weekly off / holiday).
          </p>
        </div>
        <AttendanceMonthlyGrid
          register={register}
          filters={filters}
          filterOptions={{
            departments: register.departments,
            designations: register.designations,
            branches: register.branches,
          }}
        />
      </div>
    </AdminShell>
  );
}
