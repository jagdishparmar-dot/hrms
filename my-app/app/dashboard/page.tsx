import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { DashboardHome } from "@/components/dashboard-home";
import { getTenantDashboardAction } from "@/lib/appwrite/actions";
import { requireCompanyAdmin } from "@/lib/appwrite/auth";
import { getDashboardStatsAction } from "@/lib/appwrite/phase1-actions";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Workforce, attendance, and leave overview for your organization.",
  path: "/dashboard",
});

export default async function DashboardPage() {
  await requireCompanyAdmin();
  const [snapshot, tenant] = await Promise.all([
    getDashboardStatsAction(),
    getTenantDashboardAction(),
  ]);

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`${tenant.company.name} · ${tenant.membership.role.replaceAll("_", " ")}`}
    >
      <div className="@container/main">
        <DashboardHome
          snapshot={snapshot}
          tenant={{
            companyName: tenant.company.name,
            role: tenant.membership.role,
            userName: tenant.user.name || tenant.user.email,
          }}
        />
      </div>
    </AdminShell>
  );
}
