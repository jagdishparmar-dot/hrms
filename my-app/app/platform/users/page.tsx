import { Shield, Users } from 'lucide-react';

import { AdminShell } from '@/components/admin-shell';
import {
  PlatformInfoList,
  PlatformPageBanner,
  PlatformSection,
  PlatformStatusBadge,
  PlatformTableShell,
} from '@/components/platform/platform-section';
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
      <div className="flex flex-col gap-6">
        <PlatformPageBanner
          badge="Access control"
          title="User & role management"
          description="Platform Super Admins are allowlisted (PLATFORM_ADMIN_EMAILS + default Super Admin). Tenant roles remain company-scoped on employees."
          icon={Users}
        />

        <PlatformSection
          title="Platform administrators"
          description={`Default Super Admin ${DEFAULT_SUPER_ADMIN_EMAIL} is always included and protected from deletion/deactivation.`}
          icon={Shield}
        >
          <PlatformTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Auth status
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Protection
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow
                    key={admin.email}
                    className="border-border/60 hover:bg-muted/30"
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {admin.email}
                    </TableCell>
                    <TableCell>{admin.name || '—'}</TableCell>
                    <TableCell>
                      <PlatformStatusBadge status={admin.status} />
                    </TableCell>
                    <TableCell>
                      {admin.protected ? (
                        <PlatformStatusBadge status="protected" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Allowlisted
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlatformTableShell>
        </PlatformSection>

        <PlatformSection
          title="Tenant roles"
          description="Enforced inside each company via employees.role and Appwrite Team membership."
          icon={Users}
        >
          <PlatformInfoList
            items={[
              <>
                <span className="font-semibold text-foreground">company_admin</span>{' '}
                — full tenant administration
              </>,
              <>
                <span className="font-semibold text-foreground">
                  hr_manager / payroll_admin / reporting_manager / vendor_admin /
                  employee
                </span>{' '}
                — tenant-scoped roles (schema ready)
              </>,
              <>
                <span className="font-semibold text-foreground">platform_admin</span>{' '}
                — not a tenant membership; email allowlist only, unrestricted
                across tenants
              </>,
            ]}
          />
        </PlatformSection>
      </div>
    </AdminShell>
  );
}
