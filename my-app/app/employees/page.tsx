import Link from "next/link";
import { Settings2 } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { EmployeesDirectory } from "@/components/employees-directory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import {
  listEmployeesAction,
  listShiftsAction,
  listSitesAction,
  listThreePlVendorsAction,
} from "@/lib/appwrite/phase1-actions";
import {
  employeeCodeConfigFromSettings,
  previewNextEmployeeCode,
} from "@/lib/employee-code";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Employees",
  description: "Browse, search, and manage your workforce directory, roles, and employment details.",
  path: "/employees",
});

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const ctx = await requireCompanyAdmin();
  const codeSettings = employeeCodeConfigFromSettings(ctx.company.settings);
  const employeeCodeConfig = {
    autoGenerate: codeSettings.autoGenerate,
    suggestedCode: previewNextEmployeeCode(ctx.company.settings),
    prefix: codeSettings.prefix,
  };
  const [{ employees }, sites, shifts, vendors] = await Promise.all([
    listEmployeesAction(q),
    listSitesAction(),
    listShiftsAction(),
    listThreePlVendorsAction(),
  ]);

  const orgReady =
    ctx.company.settings.departments.length > 0 &&
    ctx.company.settings.designations.length > 0;

  return (
    <AdminShell title="Employees" subtitle="Workforce directory">
      <div className="@container/main flex flex-col gap-6">
        <PageHeader
          title="Employees"
          description="Manage your workforce — profiles, access, org structure, and employment types."
          actions={
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/settings" />}
            >
              <Settings2 className="size-4" />
              Org settings
            </Button>
          }
        />

        {!orgReady ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Configure{" "}
            <Link
              href="/settings"
              className="font-medium underline underline-offset-4"
            >
              departments and designations
            </Link>{" "}
            in company settings before adding employees.
          </div>
        ) : null}

        <EmployeesDirectory
          employees={employees}
          sites={sites}
          shifts={shifts}
          orgConfig={{
            departments: ctx.company.settings.departments,
            designations: ctx.company.settings.designations,
          }}
          vendors={vendors}
          employeeCodeConfig={employeeCodeConfig}
          maxEmployees={ctx.company.maxEmployees}
        />
      </div>
    </AdminShell>
  );
}
