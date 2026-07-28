import { redirect } from 'next/navigation';

import { EmployeePunchPanel } from '@/components/employee-punch-panel';
import { requireTenantMember } from '@/lib/appwrite/auth';
import {
  getMyPunchPortalAction,
  listShiftCatalogAction,
} from '@/lib/appwrite/employee-portal-actions';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'Home',
  description: 'Clock in and out, view today’s shift, and check attendance status.',
  path: '/me',
});

export default async function EmployeeHomePage() {
  const ctx = await requireTenantMember();
  if (isCompanyAdminRole(ctx.membership.role)) {
    redirect('/dashboard');
  }

  const [portal, shiftCatalog] = await Promise.all([
    getMyPunchPortalAction(),
    listShiftCatalogAction(),
  ]);

  return <EmployeePunchPanel initial={portal} shiftCatalog={shiftCatalog} />;
}
