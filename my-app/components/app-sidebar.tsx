'use client';

import * as React from 'react';
import {
  BellIcon,
  Building2Icon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MapPinIcon,
  PaletteIcon,
  PlugIcon,
  Settings2Icon,
  SettingsIcon,
  ShieldIcon,
  Sparkles,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';

import { NavMain, type NavMainItem } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  company: {
    name: string;
    plan: string;
    slug?: string;
  };
  user: {
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  };
  isAdmin?: boolean;
  showPlatform?: boolean;
  mode?: 'tenant' | 'platform';
};

function tenantNav(isAdmin: boolean, showPlatform: boolean): NavMainItem[] {
  return [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: <LayoutDashboardIcon />,
    },
    ...(isAdmin
      ? [
          {
            title: 'Employees',
            url: '/employees',
            icon: <UsersIcon />,
          },
          {
            title: 'Sites',
            url: '/sites',
            icon: <MapPinIcon />,
          },
          {
            title: 'Shifts',
            url: '/shifts',
            icon: <CalendarClockIcon />,
            items: [
              { title: 'Shift catalog', url: '/shifts' },
              { title: 'Roster', url: '/shifts/roster' },
            ],
          },
          {
            title: 'Attendance',
            url: '/attendance',
            icon: <ClipboardListIcon />,
            items: [
              { title: 'Daily log', url: '/attendance' },
              { title: 'Monthly register', url: '/attendance/monthly' },
            ],
          },
        ]
      : []),
    {
      title: 'Leave',
      url: '/leave',
      icon: <CalendarDaysIcon />,
    },
    ...(isAdmin
      ? [
          {
            title: 'Payroll',
            url: '/payroll',
            icon: <WalletIcon />,
          },
          {
            title: 'Settings',
            url: '/settings',
            icon: <SettingsIcon />,
          },
          {
            title: 'Help & Support',
            url: '/help',
            icon: <LifeBuoyIcon />,
          },
        ]
      : []),
    ...(showPlatform
      ? [
          {
            title: 'Platform',
            url: '/platform',
            icon: <Building2Icon />,
          },
        ]
      : []),
  ];
}

function platformNav(): NavMainItem[] {
  return [
    {
      title: 'Overview',
      url: '/platform',
      icon: <LayoutDashboardIcon />,
      exact: true,
    },
    {
      title: 'Companies',
      url: '/platform/companies',
      icon: <Building2Icon />,
      items: [
        { title: 'All tenants', url: '/platform/companies' },
        { title: 'Create company', url: '/platform/companies/new' },
      ],
    },
    {
      title: 'Billing',
      url: '/platform/billing',
      icon: <CreditCardIcon />,
    },
    {
      title: 'Users & roles',
      url: '/platform/users',
      icon: <UsersIcon />,
    },
    {
      title: 'Security',
      url: '/platform/security',
      icon: <ShieldIcon />,
    },
    {
      title: 'Branding',
      url: '/platform/branding',
      icon: <PaletteIcon />,
    },
    {
      title: 'Notifications',
      url: '/platform/notifications',
      icon: <BellIcon />,
    },
    {
      title: 'Integrations',
      url: '/platform/integrations',
      icon: <PlugIcon />,
    },
    {
      title: 'System',
      url: '/platform/system',
      icon: <Settings2Icon />,
    },
  ];
}

export function AppSidebar({
  company,
  user,
  isAdmin = false,
  showPlatform = false,
  mode = 'tenant',
  className,
  ...props
}: AppSidebarProps) {
  const navMain =
    mode === 'platform' ? platformNav() : tenantNav(isAdmin, showPlatform);
  const isPlatform = mode === 'platform';

  return (
    <Sidebar
      collapsible="icon"
      className={cn('border-border', className)}
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <TeamSwitcher company={company} mode={mode} />
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <NavMain
          items={navMain}
          label={isPlatform ? 'Platform console' : 'HR Portal'}
          accent={isPlatform ? 'rose' : 'indigo'}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="mb-2 hidden px-2 group-data-[collapsible=icon]:hidden md:block">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground',
              isPlatform
                ? 'border-rose-500/20 bg-rose-500/5'
                : 'border-indigo-500/20 bg-indigo-500/5',
            )}
          >
            <Sparkles
              className={cn(
                'size-3 shrink-0',
                isPlatform ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400',
              )}
            />
            <span>Slate canvas · {isPlatform ? 'Rose' : 'Indigo'} accent</span>
          </div>
        </div>
        <NavUser
          user={user}
          showPlatform={showPlatform || mode === 'platform'}
          accent={isPlatform ? 'rose' : 'indigo'}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
