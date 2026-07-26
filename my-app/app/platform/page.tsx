import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformNavGrid,
  PlatformPageBanner,
  PlatformSection,
  PlatformStat,
  PlatformStatusBadge,
} from '@/components/platform/platform-section';
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
  description:
    'Platform overview with tenant counts, health metrics, and recent audit activity.',
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
      <div className="@container/main flex flex-col gap-6">
        <PlatformPageBanner
          badge="Platform console"
          title="Multi-tenant SaaS administration"
          description="Central control for tenant lifecycle, billing posture, security governance, and system health across the CheckIn HR fleet."
          icon={Sparkles}
          action={
            <Button
              variant="outline"
              render={<Link href="/platform/companies" />}
            >
              View all tenants
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformStat
            label="Tenants"
            value={overview.totalCompanies}
            icon={Building2}
            tone="rose"
          />
          <PlatformStat
            label="Active"
            value={overview.byStatus.active || 0}
            hint="Operational companies"
            icon={Users}
            tone="emerald"
          />
          <PlatformStat
            label="Suspended / archived"
            value={
              (overview.byStatus.suspended || 0) +
              (overview.byStatus.archived || 0)
            }
            icon={Shield}
            tone="amber"
          />
          <PlatformStat
            label="Memberships"
            value={overview.totalUsers}
            hint="Across all tenants"
            icon={CreditCard}
            tone="indigo"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <PlatformSection
            className="xl:col-span-2"
            title="Recent tenants"
            description="Newest companies on the platform."
            icon={Building2}
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
            <div className="space-y-2">
              {overview.recent.map((company) => (
                <Link
                  key={company.id}
                  href={`/platform/companies/${company.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3.5 py-3 transition-colors hover:border-rose-500/40 hover:bg-muted/30"
                >
                  <div>
                    <p className="font-semibold text-foreground">{company.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {company.slug} · {company.plan}
                    </p>
                  </div>
                  <PlatformStatusBadge status={company.status} />
                </Link>
              ))}
              {overview.recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No companies yet. Provision the first tenant.
                </p>
              ) : null}
            </div>
          </PlatformSection>

          <PlatformSection
            title="Plan distribution"
            description="Subscription mix across tenants."
            icon={CreditCard}
          >
            <div className="space-y-2">
              {Object.entries(overview.plans).map(([plan, count]) => (
                <div
                  key={plan}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-foreground">{plan}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
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
            icon={Sparkles}
          >
            <PlatformNavGrid
              items={[
                { label: 'Companies', href: '/platform/companies' },
                { label: 'Billing', href: '/platform/billing' },
                { label: 'Users & roles', href: '/platform/users' },
                { label: 'Security', href: '/platform/security' },
                { label: 'Branding', href: '/platform/branding' },
                { label: 'Notifications', href: '/platform/notifications' },
                { label: 'Integrations', href: '/platform/integrations' },
                { label: 'System', href: '/platform/system' },
              ]}
            />
          </PlatformSection>

          <PlatformSection
            title="Recent audit activity"
            description="Company-level configuration and lifecycle events."
            icon={Shield}
          >
            <div className="space-y-2">
              {audits.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/60 bg-background/30 px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
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

        <p className="font-mono text-[11px] text-muted-foreground">
          Default Super Admin: {DEFAULT_SUPER_ADMIN_EMAIL} (protected from deletion
          / deactivation).
        </p>
      </div>
    </AdminShell>
  );
}
