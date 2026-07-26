import { UserPlus } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import { PlatformProvisionForm } from '@/components/platform/provision-form';
import {
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
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
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Provisioning"
          title="Create company"
          description="Creates an Appwrite Auth user, Team, company document, and company_admin membership. Tenant data stays isolated by companyId and Team permissions."
          icon={UserPlus}
        />
        <PlatformSection
          title="Tenant details"
          description="Slug becomes the subdomain key. Temp password should be rotated on first login."
          icon={UserPlus}
        >
          <PlatformProvisionForm />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
