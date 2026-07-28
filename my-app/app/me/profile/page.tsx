import { redirect } from 'next/navigation';

import { EmployeeProfileForm } from '@/components/employee-profile-form';
import { requireTenantMember } from '@/lib/appwrite/auth';
import { getMyProfilePortalAction } from '@/lib/appwrite/employee-portal-actions';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata({
  title: 'My profile',
  description: 'View employment details and update contact and payroll information.',
  path: '/me/profile',
});

export default async function EmployeeProfilePage() {
  const ctx = await requireTenantMember();
  if (isCompanyAdminRole(ctx.membership.role)) {
    redirect('/employees');
  }

  const profile = await getMyProfilePortalAction();

  return (
    <>
      <div className="mb-4 hidden md:block">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your contact and compliance details.
        </p>
      </div>
      <EmployeeProfileForm
        employee={profile.employee}
        reportingManager={profile.reportingManager}
        officeLocation={profile.officeLocation}
      />
    </>
  );
}
