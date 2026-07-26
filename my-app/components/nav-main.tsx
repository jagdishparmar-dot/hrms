'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react';

export type NavMainItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  /** When true, only exact pathname match is active (no prefix). */
  exact?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

export function NavMain({
  items,
  label = 'Menu',
  accent = 'indigo',
}: {
  items: NavMainItem[];
  label?: string;
  accent?: 'indigo' | 'rose';
}) {
  const pathname = usePathname();

  const iconTone =
    accent === 'rose'
      ? '[&_svg]:text-rose-600 dark:[&_svg]:text-rose-400'
      : '[&_svg]:text-indigo-600 dark:[&_svg]:text-indigo-400';

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = Boolean(item.items?.length);
          const active =
            item.isActive ??
            (item.exact
              ? pathname === item.url
              : pathname === item.url || pathname.startsWith(`${item.url}/`));

          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.title}
                  className={cn(
                    'rounded-xl text-sidebar-foreground/80',
                    !active && iconTone,
                    !active &&
                      'hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
                  )}
                  render={<Link href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              defaultOpen={active}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    className={cn(
                      'rounded-xl text-sidebar-foreground/80',
                      !active && iconTone,
                      !active &&
                        'hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
                    )}
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon
                  className={cn(
                    'ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="mr-0 border-l border-sidebar-border/80">
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={pathname === subItem.url}
                        className="rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        render={<Link href={subItem.url} />}
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
