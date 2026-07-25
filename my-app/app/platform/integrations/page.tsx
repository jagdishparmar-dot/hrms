import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
import { Badge } from '@/components/ui/badge';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { appwriteConfig } from '@/lib/appwrite/config';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Integrations',
  description: 'Appwrite project integration endpoints and mobile API configuration.',
  path: '/platform/integrations',
});

export default async function PlatformIntegrationsPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="Integrations" subtitle="Connected systems">
      <PageHeader
        title="Integrations"
        description="Core platform dependencies and feature flags that unlock connectors per tenant."
      />
      <PlatformSection title="Core services">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <div>
              <p className="font-medium">Appwrite</p>
              <p className="text-xs text-muted-foreground">
                {appwriteConfig.endpoint}
              </p>
            </div>
            <Badge>Connected</Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <div>
              <p className="font-medium">Database</p>
              <p className="text-xs text-muted-foreground">
                {appwriteConfig.databaseId}
              </p>
            </div>
            <Badge variant="secondary">hr_portal</Badge>
          </div>
        </div>
      </PlatformSection>
      <PlatformSection
        title="Per-tenant connectors"
        description="Enabled via company feature flags."
      >
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>SSO — feature flag <code>sso</code></li>
          <li>3PL payroll — feature flag <code>payroll3pl</code></li>
          <li>Selfie punch / geofencing — attendance flags</li>
        </ul>
      </PlatformSection>
    </AdminShell>
  );
}
