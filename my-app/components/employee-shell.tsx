import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  EmployeeDesktopSidebar,
  EmployeeMobileHeader,
} from '@/components/employee-shell-chrome';
import { EmployeeBottomNav } from '@/components/employee-bottom-nav';
import { requireTenantMember } from '@/lib/appwrite/auth';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import { cn } from '@/lib/utils';

export async function EmployeeShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ctx = await requireTenantMember();
  if (ctx.membership.mustChangePassword) redirect('/change-password');
  if (isCompanyAdminRole(ctx.membership.role)) redirect('/dashboard');

  const userName = ctx.user.name || ctx.membership.name || ctx.user.email || 'Employee';
  const userEmail = ctx.user.email || '';
  const chrome = {
    userName,
    userEmail,
    companyName: ctx.company.name,
    logoUrl: ctx.company.branding.logoUrl,
  };

  return (
    <div className="flex min-h-svh bg-[#F4F6FB] dark:bg-background">
      <EmployeeDesktopSidebar {...chrome} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <EmployeeMobileHeader {...chrome} />
        <main
          className={cn(
            'mx-auto w-full max-w-lg flex-1 px-4 pt-4',
            'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:max-w-3xl md:px-6 md:pb-8 md:pt-6 lg:max-w-5xl',
            className,
          )}
        >
          {children}
        </main>
        <EmployeeBottomNav />
      </div>
    </div>
  );
}
