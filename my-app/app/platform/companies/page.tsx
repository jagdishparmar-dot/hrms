import { Suspense } from 'react';

import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformCompaniesTable } from '@/components/platform/companies-table';
import { PlatformSection } from '@/components/platform/platform-section';
import { listPlatformCompaniesAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Companies',
  description: 'Manage tenant companies, plans, and lifecycle status.',
  path: '/platform/companies',
});

export default async function PlatformCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const result = await listPlatformCompaniesAction({
    q: params.q || '',
    status: params.status || 'all',
    page: Number(params.page || 1),
    pageSize: 25,
  });

  return (
    <AdminShell mode="platform" title="Companies" subtitle="Tenant management">
      <PageHeader
        title="Company / tenant management"
        description="View, create, activate, suspend, and archive companies. Operational settings and branding are managed per tenant."
      />
      <PlatformSection
        title="Registered companies"
        description="Search and filter across the tenant fleet. Sensitive status changes require typed confirmation."
      >
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <PlatformCompaniesTable
            items={result.items}
            total={result.total}
            page={result.page}
            pageSize={result.pageSize}
            q={params.q || ''}
            status={params.status || 'all'}
          />
        </Suspense>
      </PlatformSection>
    </AdminShell>
  );
}
