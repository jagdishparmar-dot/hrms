import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Building2, Users } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformAuditTable,
  PlatformCompanyConfigForm,
  PlatformCompanyLifecycle,
  PlatformCompanyPlanForm,
  PlatformCompanyUsersTable,
} from '@/components/platform/company-detail-forms';
import {
  PlatformPageBanner,
  PlatformSection,
  PlatformStat,
} from '@/components/platform/platform-section';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPlatformCompanyDetailAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: 'Company details',
    description: 'Manage tenant configuration, plan, users, and lifecycle.',
    path: `/platform/companies/${id}`,
  });
}

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
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge={company.status}
          title={company.name}
          description="Manage subscription, lifecycle, configuration, modules, and review the audit trail. Tenant isolation is preserved — mutations still target this companyId only."
          icon={Building2}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformStat label="Users" value={metrics.users} icon={Users} tone="indigo" />
          <PlatformStat
            label="Active"
            value={metrics.activeUsers}
            tone="emerald"
          />
          <PlatformStat label="Admins" value={metrics.admins} tone="rose" />
          <PlatformStat
            label="Seat cap"
            value={company.maxEmployees}
            tone="sky"
          />
        </div>

        <PlatformSection
          title="Lifecycle"
          description="Activate, suspend, or archive with confirmation phrases."
          icon={Building2}
          action={<PlatformCompanyLifecycle company={company} />}
        >
          <p className="text-sm text-muted-foreground">
            Suspended and archived tenants cannot open the HR app. Data remains
            isolated and is not deleted by these actions.
          </p>
        </PlatformSection>

        <Tabs defaultValue="config">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-border bg-card p-1">
            <TabsTrigger
              value="config"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold data-active:bg-rose-600 data-active:text-white data-active:shadow-md data-active:shadow-rose-950/40"
            >
              Configuration
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold data-active:bg-rose-600 data-active:text-white data-active:shadow-md data-active:shadow-rose-950/40"
            >
              Subscription
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold data-active:bg-rose-600 data-active:text-white data-active:shadow-md data-active:shadow-rose-950/40"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold data-active:bg-rose-600 data-active:text-white data-active:shadow-md data-active:shadow-rose-950/40"
            >
              Audit trail
            </TabsTrigger>
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
              icon={Users}
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
      </div>
    </AdminShell>
  );
}
