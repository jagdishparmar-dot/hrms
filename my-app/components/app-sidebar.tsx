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
  MapPinIcon,
  PaletteIcon,
  PlugIcon,
  Settings2Icon,
  SettingsIcon,
  ShieldIcon,
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
  ...props
}: AppSidebarProps) {
  const navMain =
    mode === 'platform' ? platformNav() : tenantNav(isAdmin, showPlatform);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher company={company} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMain}
          label={mode === 'platform' ? 'Platform console' : 'HR Portal'}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} showPlatform={showPlatform || mode === 'platform'} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
