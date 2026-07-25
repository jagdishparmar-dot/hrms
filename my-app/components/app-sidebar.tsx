'use client';

import * as React from 'react';
import {
  Building2Icon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  SettingsIcon,
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
};

export function AppSidebar({
  company,
  user,
  isAdmin = false,
  showPlatform = false,
  ...props
}: AppSidebarProps) {
  const navMain: NavMainItem[] = [
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher company={company} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} label="HR Portal" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} showPlatform={showPlatform} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
