import { AdminShell } from "@/components/admin-shell";
import { EmployeesDirectory } from "@/components/employees-directory";
import { PageHeader } from "@/components/page-header";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import {
  listEmployeesAction,
  listShiftsAction,
  listSitesAction,
  listThreePlVendorsAction,
} from "@/lib/appwrite/phase1-actions";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const ctx = await requireCompanyAdmin();
  const [{ employees }, sites, shifts, vendors] = await Promise.all([
    listEmployeesAction(q),
    listSitesAction(),
    listShiftsAction(),
    listThreePlVendorsAction(),
  ]);

  return (
    <AdminShell title="Employees" subtitle="Hire, assign sites, and manage profiles">
      <PageHeader
        title="Employees"
        description="Create accounts, update profiles, deactivate access, or remove people."
      />
      <EmployeesDirectory
        employees={employees}
        sites={sites}
        shifts={shifts}
        orgConfig={{
          departments: ctx.company.settings.departments,
          designations: ctx.company.settings.designations,
        }}
        vendors={vendors}
      />
    </AdminShell>
  );
}
