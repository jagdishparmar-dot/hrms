import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import {
  PlatformCompanyCard,
  PlatformProvisionForm,
} from "@/components/platform-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCompaniesForPlatformAction } from "@/lib/appwrite/actions";
import { requirePlatformAdmin } from "@/lib/appwrite/auth";

export default async function PlatformPage() {
  const admin = await requirePlatformAdmin();
  const companies = await listCompaniesForPlatformAction();

  return (
    <AdminShell
      mode="platform"
      title="Platform"
      subtitle={`Signed in as ${admin.email}`}
    >
      <PageHeader
        title="Super Admin Console"
        description="Provision tenants and manage plans, status, and feature flags."
      />

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Provision company</CardTitle>
          <CardDescription>
            Creates Auth user, Team, company document, and company_admin membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformProvisionForm />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">
          Tenants ({companies.length})
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {companies.map((company) => (
            <PlatformCompanyCard key={company.id} company={company} />
          ))}
          {companies.length === 0 ? (
            <Card className="shadow-xs lg:col-span-2">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No companies yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
