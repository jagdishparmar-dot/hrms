import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
import { listRecentPlatformAuditsAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';
import { PlatformAuditTable } from '@/components/platform/company-detail-forms';

export default async function PlatformSecurityPage() {
  await requirePlatformAdmin();
  const audits = await listRecentPlatformAuditsAction();

  return (
    <AdminShell mode="platform" title="Security" subtitle="Governance">
      <PageHeader
        title="Security & compliance"
        description="Controls that protect platform integrity and tenant isolation."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformSection
          title="Access control"
          description="How platform and tenant authorization is enforced."
        >
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              Platform routes require an authenticated allowlisted Super Admin.
            </li>
            <li>
              Default Super Admin ({DEFAULT_SUPER_ADMIN_EMAIL}) cannot be deleted
              or deactivated through platform tooling.
            </li>
            <li>
              Tenant companyId is derived server-side from session + membership —
              never trusted from the client for authorization.
            </li>
            <li>
              Suspended / archived tenants are blocked from the HR app.
            </li>
            <li>
              Sensitive lifecycle changes require typed confirmation phrases.
            </li>
          </ul>
        </PlatformSection>

        <PlatformSection
          title="Data isolation"
          description="Defense in depth for multi-tenant SaaS."
        >
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Every tenant query includes an explicit companyId filter.</li>
            <li>
              Appwrite Teams + document permissions backstop application checks.
            </li>
            <li>
              Platform admin listing uses the server admin client; tenant users
              never receive cross-tenant reads.
            </li>
            <li>
              Archive/suspend does not copy or merge tenant data across companies.
            </li>
          </ul>
        </PlatformSection>
      </div>

      <PlatformSection
        title="Recent audit events"
        description="Latest company configuration and lifecycle actions."
      >
        <PlatformAuditTable logs={audits} />
      </PlatformSection>
    </AdminShell>
  );
}
