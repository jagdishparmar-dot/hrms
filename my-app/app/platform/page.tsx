import Link from 'next/link';

import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import {
  PlatformSection,
  PlatformStat,
} from '@/components/platform/platform-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPlatformOverviewAction,
  listRecentPlatformAuditsAction,
} from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Overview',
  description: 'Platform overview with tenant counts, health metrics, and recent audit activity.',
  path: '/platform',
});

export default async function PlatformOverviewPage() {
  const admin = await requirePlatformAdmin();
  const [overview, audits] = await Promise.all([
    getPlatformOverviewAction(),
    listRecentPlatformAuditsAction(),
  ]);

  return (
    <AdminShell
      mode="platform"
      title="Platform"
      subtitle={`Signed in as ${admin.email}`}
      action={
        <Button render={<Link href="/platform/companies/new" />}>
          New company
        </Button>
      }
    >
      <PageHeader
        title="Platform console"
        description="Central SaaS administration for tenants, billing posture, security, and system health."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformStat label="Tenants" value={overview.totalCompanies} />
        <PlatformStat
          label="Active"
          value={overview.byStatus.active || 0}
          hint="Operational companies"
        />
        <PlatformStat
          label="Suspended / archived"
          value={
            (overview.byStatus.suspended || 0) +
            (overview.byStatus.archived || 0)
          }
        />
        <PlatformStat
          label="Memberships"
          value={overview.totalUsers}
          hint="Across all tenants"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PlatformSection
          className="xl:col-span-2"
          title="Recent tenants"
          description="Newest companies on the platform."
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/platform/companies" />}
            >
              View all
            </Button>
          }
        >
          <div className="space-y-3">
            {overview.recent.map((company) => (
              <Link
                key={company.id}
                href={`/platform/companies/${company.id}`}
                className="flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {company.slug} · {company.plan}
                  </p>
                </div>
                <Badge variant="secondary">{company.status}</Badge>
              </Link>
            ))}
            {overview.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No companies yet. Provision the first tenant.
              </p>
            ) : null}
          </div>
        </PlatformSection>

        <PlatformSection
          title="Plan distribution"
          description="Subscription mix across tenants."
        >
          <div className="space-y-2">
            {Object.entries(overview.plans).map(([plan, count]) => (
              <div
                key={plan}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">{plan}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(overview.plans).length === 0 ? (
              <p className="text-sm text-muted-foreground">No plan data.</p>
            ) : null}
          </div>
        </PlatformSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformSection
          title="Platform settings"
          description="Jump to administration areas."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Companies', '/platform/companies'],
              ['Billing', '/platform/billing'],
              ['Users & roles', '/platform/users'],
              ['Security', '/platform/security'],
              ['Branding', '/platform/branding'],
              ['Notifications', '/platform/notifications'],
              ['Integrations', '/platform/integrations'],
              ['System', '/platform/system'],
            ].map(([label, href]) => (
              <Button
                key={href}
                variant="outline"
                className="justify-start"
                render={<Link href={href} />}
              >
                {label}
              </Button>
            ))}
          </div>
        </PlatformSection>

        <PlatformSection
          title="Recent audit activity"
          description="Company-level configuration and lifecycle events."
        >
          <div className="space-y-2">
            {audits.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.$createdAt
                    ? new Date(log.$createdAt).toLocaleString()
                    : '—'}
                  {log.companyId ? ` · tenant ${log.companyId.slice(0, 8)}` : ''}
                </p>
              </div>
            ))}
            {audits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            ) : null}
          </div>
        </PlatformSection>
      </div>

      <p className="text-xs text-muted-foreground">
        Default Super Admin: {DEFAULT_SUPER_ADMIN_EMAIL} (protected from
        deletion / deactivation).
      </p>
    </AdminShell>
  );
}
