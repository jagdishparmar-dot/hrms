'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { logoutAction } from '@/lib/appwrite/actions';
import { cn } from '@/lib/utils';
import {
  Building2Icon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react';

function initials(name: string, email: string) {
  const source = name?.trim() || email?.trim() || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function NavUser({
  user,
  showPlatform = false,
  isAdmin = true,
  accent = 'indigo',
}: {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  showPlatform?: boolean;
  isAdmin?: boolean;
  accent?: 'indigo' | 'rose';
}) {
  const { isMobile } = useSidebar();
  const fallback = initials(user.name, user.email);
  const ringClass =
    accent === 'rose'
      ? 'ring-rose-500/40'
      : 'ring-indigo-500/40';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="rounded-xl aria-expanded:bg-sidebar-accent"
              />
            }
          >
            <Avatar className={cn('size-8 ring-2', ringClass)}>
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-sidebar-foreground">
                {user.name || 'User'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border-border bg-popover"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className={cn('size-8 ring-2', ringClass)}>
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name || 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.role?.replaceAll('_', ' ') || user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {isAdmin ? (
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <SettingsIcon />
                  Settings
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem render={<Link href="/me/profile" />}>
                  <SettingsIcon />
                  Profile
                </DropdownMenuItem>
              )}
              {showPlatform ? (
                <DropdownMenuItem render={<Link href="/platform" />}>
                  <Building2Icon />
                  Platform
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void logoutAction();
              }}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
