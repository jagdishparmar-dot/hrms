import { Shield } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import { PlatformAuditTable } from '@/components/platform/company-detail-forms';
import {
  PlatformInfoList,
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
import { listRecentPlatformAuditsAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Security',
  description: 'Platform security settings and audit log review.',
  path: '/platform/security',
});

export default async function PlatformSecurityPage() {
  await requirePlatformAdmin();
  const audits = await listRecentPlatformAuditsAction();

  return (
    <AdminShell mode="platform" title="Security" subtitle="Governance">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Governance"
          title="Security & compliance"
          description="Controls that protect platform integrity and tenant isolation."
          icon={Shield}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <PlatformSection
            title="Access control"
            description="How platform and tenant authorization is enforced."
            icon={Shield}
          >
            <PlatformInfoList
              items={[
                'Platform routes require an authenticated allowlisted Super Admin.',
                <>
                  Default Super Admin ({DEFAULT_SUPER_ADMIN_EMAIL}) cannot be
                  deleted or deactivated through platform tooling.
                </>,
                'Tenant companyId is derived server-side from session + membership — never trusted from the client for authorization.',
                'Suspended / archived tenants are blocked from the HR app.',
                'Sensitive lifecycle changes require typed confirmation phrases.',
              ]}
            />
          </PlatformSection>

          <PlatformSection
            title="Data isolation"
            description="Defense in depth for multi-tenant SaaS."
            icon={Shield}
          >
            <PlatformInfoList
              items={[
                'Every tenant query includes an explicit companyId filter.',
                'Appwrite Teams + document permissions backstop application checks.',
                'Platform admin listing uses the server admin client; tenant users never receive cross-tenant reads.',
                'Archive/suspend does not copy or merge tenant data across companies.',
              ]}
            />
          </PlatformSection>
        </div>

        <PlatformSection
          title="Recent audit events"
          description="Latest company configuration and lifecycle actions."
          icon={Shield}
        >
          <PlatformAuditTable logs={audits} />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
