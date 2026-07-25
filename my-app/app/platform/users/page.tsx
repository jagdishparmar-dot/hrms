import { AdminShell } from '@/components/admin-shell';
import { PageHeader } from '@/components/page-header';
import { PlatformSection } from '@/components/platform/platform-section';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listPlatformAdminsAction } from '@/lib/appwrite/platform-actions';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { DEFAULT_SUPER_ADMIN_EMAIL } from '@/lib/appwrite/super-admin';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Platform users',
  description: 'View platform administrators and super admin access.',
  path: '/platform/users',
});

export default async function PlatformUsersPage() {
  await requirePlatformAdmin();
  const admins = await listPlatformAdminsAction();

  return (
    <AdminShell mode="platform" title="Users & roles" subtitle="Platform access">
      <PageHeader
        title="User & role management"
        description="Platform Super Admins are allowlisted (PLATFORM_ADMIN_EMAILS + default Super Admin). Tenant roles remain company-scoped on employees."
      />

      <PlatformSection
        title="Platform administrators"
        description={`Default Super Admin ${DEFAULT_SUPER_ADMIN_EMAIL} is always included and protected from deletion/deactivation.`}
      >
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Auth status</TableHead>
                <TableHead>Protection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.email}>
                  <TableCell className="font-medium">{admin.email}</TableCell>
                  <TableCell>{admin.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{admin.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {admin.protected ? (
                      <Badge>Protected Super Admin</Badge>
                    ) : (
                      <span className="text-muted-foreground">Allowlisted</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PlatformSection>

      <PlatformSection
        title="Tenant roles"
        description="Enforced inside each company via employees.role and Appwrite Team membership."
      >
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="text-foreground">company_admin</span> — full tenant
            administration
          </li>
          <li>
            <span className="text-foreground">hr_manager / payroll_admin /
            reporting_manager / vendor_admin / employee</span>{' '}
            — tenant-scoped roles (schema ready)
          </li>
          <li>
            <span className="text-foreground">platform_admin</span> — not a tenant
            membership; email allowlist only, unrestricted across tenants
          </li>
        </ul>
      </PlatformSection>
    </AdminShell>
  );
}
