'use client';

import Link from 'next/link';
import * as React from 'react';

import { CompanyLogo } from '@/components/company-logo';
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
import { cn } from '@/lib/utils';
import { Building2Icon, ChevronsUpDownIcon, RefreshCwIcon } from 'lucide-react';

export function TeamSwitcher({
  company,
  mode = 'tenant',
}: {
  company: {
    name: string;
    plan: string;
    slug?: string;
    logoUrl?: string;
  };
  mode?: 'tenant' | 'platform';
}) {
  const { isMobile } = useSidebar();
  const isPlatform = mode === 'platform';

  const logoFallbackClass = cn(
    'aspect-square size-8',
    isPlatform
      ? 'border-rose-500/30 bg-gradient-to-br from-rose-500/20 to-indigo-500/10 text-rose-400'
      : 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-sky-500/10 text-indigo-400',
  );

  const menuLogoFallbackClass = cn(
    'size-6',
    isPlatform
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
      : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="rounded-xl data-open:bg-sidebar-accent"
              />
            }
          >
            <CompanyLogo
              logoUrl={company.logoUrl}
              alt={`${company.name} logo`}
              className="hidden aspect-square size-8 group-data-[collapsible=icon]:flex"
              fallbackClassName={logoFallbackClass}
              iconClassName="size-4"
            />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-sidebar-foreground">
                {company.name}
              </span>
              <span className="truncate text-xs font-mono capitalize text-muted-foreground">
                {isPlatform ? 'platform · console' : company.plan}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border-border bg-popover"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Current workspace
              </DropdownMenuLabel>
              <DropdownMenuItem disabled className="gap-2 p-2">
                <CompanyLogo
                  logoUrl={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="size-6"
                  fallbackClassName={menuLogoFallbackClass}
                  iconClassName="size-3.5"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{company.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {company.slug || company.plan}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<Link href="/select-company" />}
                className="gap-2 p-2"
              >
                <RefreshCwIcon className="size-4" />
                Switch company
              </DropdownMenuItem>
              {isPlatform ? (
                <DropdownMenuItem
                  render={<Link href="/dashboard" />}
                  className="gap-2 p-2"
                >
                  <Building2Icon className="size-4" />
                  Tenant dashboard
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
