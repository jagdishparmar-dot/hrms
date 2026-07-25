import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { appwriteConfig } from '@/lib/appwrite/config';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';

export default async function PlatformSystemPage() {
  await requirePlatformAdmin();

  return (
    <AdminShell mode="platform" title="System" subtitle="Configuration">
      <PageHeader
        title="System configuration"
        description="Runtime platform parameters relevant to multi-tenant operations."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformSection title="Environment">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Appwrite project</dt>
              <dd className="font-mono text-xs">{appwriteConfig.projectId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Database</dt>
              <dd className="font-mono text-xs">{appwriteConfig.databaseId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Apex hosts</dt>
              <dd className="text-right text-xs">
                {appwriteConfig.apexHosts.join(', ')}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Late grace default</dt>
              <dd>{appwriteConfig.lateGraceMinutes} min</dd>
            </div>
          </dl>
        </PlatformSection>

        <PlatformSection title="Super Admin">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Default email</dt>
              <dd className="text-right">{DEFAULT_SUPER_ADMIN_EMAIL}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Allowlisted admins</dt>
              <dd>{appwriteConfig.platformAdminEmails.length}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Seed with <code>node appwrite/seed-super-admin.mjs</code>. The default
            email is always treated as platform admin even if omitted from env.
          </p>
        </PlatformSection>
      </div>

      <PlatformSection
        title="SaaS operations checklist"
        description="Aligned with multi-tenant onboarding / lifecycle."
      >
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Provision company (Auth + Team + company doc + admin membership).</li>
          <li>Configure branding, modules, attendance/payroll defaults.</li>
          <li>Activate tenant; monitor usage from company detail metrics.</li>
          <li>Suspend or archive with confirmation when required.</li>
          <li>Review audit trail for configuration changes.</li>
        </ol>
      </PlatformSection>
    </AdminShell>
  );
}
