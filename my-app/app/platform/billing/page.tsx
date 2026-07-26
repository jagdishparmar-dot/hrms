import { CreditCard, DollarSign } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformPageBanner,
  PlatformSection,
  PlatformStat,
  PlatformStatusBadge,
  PlatformTableShell,
} from '@/components/platform/platform-section';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getPlatformOverviewAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Billing',
  description: 'Platform billing overview and tenant plan distribution.',
  path: '/platform/billing',
});

export default async function PlatformBillingPage() {
  await requirePlatformAdmin();
  const overview = await getPlatformOverviewAction();

  return (
    <AdminShell mode="platform" title="Billing" subtitle="Subscription posture">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Commercial"
          title="Subscription & billing"
          description="Plan distribution and seat posture across tenants. Invoice/payment gateway wiring can attach here without changing tenant isolation."
          icon={CreditCard}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <PlatformStat
            label="Tenants"
            value={overview.totalCompanies}
            icon={CreditCard}
            tone="rose"
          />
          <PlatformStat
            label="Paid-ready plans"
            value={Object.keys(overview.plans).filter((p) => p !== 'free').length}
            hint="Distinct non-free plan labels"
            icon={DollarSign}
            tone="indigo"
          />
          <PlatformStat
            label="Active tenants"
            value={overview.byStatus.active || 0}
            tone="emerald"
          />
        </div>

        <PlatformSection
          title="Plan mix"
          description="Current commercial labels stored on company.plan."
          icon={DollarSign}
        >
          <PlatformTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Plan
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    Tenants
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(overview.plans).map(([plan, count]) => (
                  <TableRow
                    key={plan}
                    className="border-border/60 hover:bg-muted/30"
                  >
                    <TableCell>
                      <PlatformStatusBadge status={plan} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {count}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(overview.plans).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No billing data yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </PlatformTableShell>
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
