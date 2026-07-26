import { Plug, Server } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformInfoList,
  PlatformIntegrationRow,
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { appwriteConfig } from '@/lib/appwrite/config';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Integrations',
  description:
    'Appwrite project integration endpoints and mobile API configuration.',
  path: '/platform/integrations',
});

export default async function PlatformIntegrationsPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="Integrations" subtitle="Connected systems">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Connectors"
          title="Integrations"
          description="Core platform dependencies and feature flags that unlock connectors per tenant."
          icon={Plug}
        />
        <PlatformSection title="Core services" icon={Server}>
          <div className="space-y-3">
            <PlatformIntegrationRow
              name="Appwrite"
              detail={appwriteConfig.endpoint}
              status="Connected"
            />
            <PlatformIntegrationRow
              name="Database"
              detail={appwriteConfig.databaseId}
              status="active"
            />
          </div>
        </PlatformSection>
        <PlatformSection
          title="Per-tenant connectors"
          description="Enabled via company feature flags."
          icon={Plug}
        >
          <PlatformInfoList
            items={[
              <>
                SSO — feature flag{' '}
                <span className="font-mono text-rose-300">sso</span>
              </>,
              <>
                3PL payroll — feature flag{' '}
                <span className="font-mono text-rose-300">payroll3pl</span>
              </>,
              'Selfie punch / geofencing — attendance flags on company configuration.',
            ]}
          />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
