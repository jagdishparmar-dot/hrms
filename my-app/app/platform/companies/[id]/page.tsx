import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import {
  PlatformAuditTable,
  PlatformCompanyConfigForm,
  PlatformCompanyLifecycle,
  PlatformCompanyPlanForm,
  PlatformCompanyUsersTable,
} from '@/components/platform/company-detail-forms';
import {
  PlatformSection,
  PlatformStat,
} from '@/components/platform/platform-section';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPlatformCompanyDetailAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';

export default async function PlatformCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const detail = await getPlatformCompanyDetailAction(id);
  if (!detail) notFound();

  const { company, memberships, auditLogs, metrics } = detail;

  return (
    <AdminShell
      mode="platform"
      title={company.name}
      subtitle={`${company.slug} · ${company.plan}`}
      action={
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/platform/companies" />}
        >
          Back to list
        </Button>
      }
    >
      <PageHeader
        title={company.name}
        description="Platform administrators can manage subscription, lifecycle, configuration, modules, and review the audit trail. Tenant isolation is preserved — mutations still target this companyId only."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformStat label="Users" value={metrics.users} />
        <PlatformStat label="Active" value={metrics.activeUsers} />
        <PlatformStat label="Admins" value={metrics.admins} />
        <PlatformStat label="Seat cap" value={company.maxEmployees} />
      </div>

      <PlatformSection
        title="Lifecycle"
        description="Activate, suspend, or archive with confirmation phrases."
        action={<PlatformCompanyLifecycle company={company} />}
      >
        <p className="text-sm text-muted-foreground">
          Suspended and archived tenants cannot open the HR app. Data remains
          isolated and is not deleted by these actions.
        </p>
      </PlatformSection>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <PlatformSection
            title="Company configuration"
            description="Legal details, regional settings, branding, modules, payroll/attendance defaults."
          >
            <PlatformCompanyConfigForm company={company} />
          </PlatformSection>
        </TabsContent>
        <TabsContent value="subscription" className="mt-4">
          <PlatformSection
            title="Subscription & feature flags"
            description="Plan, seat limits, and commercial feature toggles."
          >
            <PlatformCompanyPlanForm company={company} />
          </PlatformSection>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <PlatformSection
            title="Tenant users"
            description="Memberships scoped to this company (first 50)."
          >
            <PlatformCompanyUsersTable memberships={memberships} />
          </PlatformSection>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <PlatformSection
            title="Audit trail"
            description="Company-level configuration and lifecycle changes."
          >
            <PlatformAuditTable logs={auditLogs} />
          </PlatformSection>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
