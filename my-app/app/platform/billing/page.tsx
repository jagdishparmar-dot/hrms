import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import {
  PlatformSection,
  PlatformStat,
} from '@/components/platform/platform-section';
import { Badge } from '@/components/ui/badge';
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
      <PageHeader
        title="Subscription & billing"
        description="Plan distribution and seat posture across tenants. Invoice/payment gateway wiring can attach here without changing tenant isolation."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <PlatformStat label="Tenants" value={overview.totalCompanies} />
        <PlatformStat
          label="Paid-ready plans"
          value={Object.keys(overview.plans).filter((p) => p !== 'free').length}
          hint="Distinct non-free plan labels"
        />
        <PlatformStat
          label="Active tenants"
          value={overview.byStatus.active || 0}
        />
      </div>

      <PlatformSection
        title="Plan mix"
        description="Current commercial labels stored on company.plan."
      >
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Tenants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(overview.plans).map(([plan, count]) => (
                <TableRow key={plan}>
                  <TableCell>
                    <Badge variant="secondary">{plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{count}</TableCell>
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
        </div>
      </PlatformSection>
    </AdminShell>
  );
}
