import type { LucideIcon } from 'lucide-react';
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  ClockIcon,
  UserIcon,
} from 'lucide-react';

export type EmployeeNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const EMPLOYEE_NAV_ITEMS: EmployeeNavItem[] = [
  { title: 'Home', href: '/me', icon: ClockIcon, exact: true },
  { title: 'Attendance', href: '/me/attendance', icon: ClipboardListIcon },
  { title: 'Leave', href: '/leave', icon: CalendarDaysIcon },
  { title: 'Profile', href: '/me/profile', icon: UserIcon },
];

export function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
