import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformProvisionForm } from '@/components/platform/provision-form';
import { PlatformSection } from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'New company',
  description: 'Provision a new tenant company on the CheckIn HR platform.',
  path: '/platform/companies/new',
});

export default async function PlatformNewCompanyPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="New company" subtitle="Provision tenant">
      <PageHeader
        title="Create company"
        description="Creates an Appwrite Auth user, Team, company document, and company_admin membership. Tenant data stays isolated by companyId and Team permissions."
      />
      <PlatformSection
        title="Tenant details"
        description="Slug becomes the subdomain key. Temp password should be rotated on first login."
      >
        <PlatformProvisionForm />
      </PlatformSection>
    </AdminShell>
  );
}
