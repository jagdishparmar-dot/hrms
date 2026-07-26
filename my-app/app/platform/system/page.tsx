import { Cpu, Settings2 } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformInfoList,
  PlatformKeyValueList,
  PlatformPageBanner,
  PlatformSection,
} from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { appwriteConfig } from '@/lib/appwrite/config';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'System',
  description:
    'Platform system configuration, database IDs, and environment health.',
  path: '/platform/system',
});

export default async function PlatformSystemPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="System" subtitle="Configuration">
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Runtime"
          title="System configuration"
          description="Runtime platform parameters relevant to multi-tenant operations."
          icon={Settings2}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <PlatformSection title="Environment" icon={Cpu}>
            <PlatformKeyValueList
              items={[
                {
                  label: 'Appwrite project',
                  value: appwriteConfig.projectId,
                  mono: true,
                },
                {
                  label: 'Database',
                  value: appwriteConfig.databaseId,
                  mono: true,
                },
                {
                  label: 'Apex hosts',
                  value: appwriteConfig.apexHosts.join(', '),
                  mono: true,
                },
                {
                  label: 'Late grace default',
                  value: `${appwriteConfig.lateGraceMinutes} min`,
                },
              ]}
            />
          </PlatformSection>

          <PlatformSection title="Super Admin" icon={Settings2}>
            <PlatformKeyValueList
              items={[
                {
                  label: 'Default email',
                  value: DEFAULT_SUPER_ADMIN_EMAIL,
                },
                {
                  label: 'Allowlisted admins',
                  value: appwriteConfig.platformAdminEmails.length,
                },
              ]}
            />
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Seed with{' '}
              <code className="text-rose-300">node appwrite/seed-super-admin.mjs</code>.
              The default email is always treated as platform admin even if omitted
              from env.
            </p>
          </PlatformSection>
        </div>

        <PlatformSection
          title="SaaS operations checklist"
          description="Aligned with multi-tenant onboarding / lifecycle."
          icon={Settings2}
        >
          <PlatformInfoList
            items={[
              'Provision company (Auth + Team + company doc + admin membership).',
              'Configure branding, modules, attendance/payroll defaults.',
              'Activate tenant; monitor usage from company detail metrics.',
              'Suspend or archive with confirmation when required.',
              'Review audit trail for configuration changes.',
            ]}
          />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
