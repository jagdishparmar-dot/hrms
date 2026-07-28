'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';

import { CompanyLogo } from '@/components/company-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/lib/appwrite/actions';
import { EMPLOYEE_NAV_ITEMS, greetingForHour } from '@/lib/employee-nav';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

function initials(name: string, email: string) {
  const source = name?.trim() || email?.trim() || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function pageTitle(pathname: string) {
  const match = EMPLOYEE_NAV_ITEMS.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );
  return match?.title ?? 'CheckIn';
}

export function EmployeeMobileHeader({
  userName,
  userEmail,
  companyName,
  logoUrl,
}: {
  userName: string;
  userEmail: string;
  companyName: string;
  logoUrl?: string;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const firstName = userName.split(' ')[0] || userName;
  const greeting = greetingForHour(new Date().getHours());
  const title = pageTitle(pathname);
  const isHome = pathname === '/me';

  return (
    <header className="relative overflow-hidden bg-linear-to-br from-[#312E81] via-[#3730A3] to-[#4338CA] text-white shadow-lg md:hidden">
      <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 size-32 rounded-full bg-indigo-300/20 blur-2xl" />

      <div className="relative mx-auto w-full max-w-lg px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo
              logoUrl={logoUrl}
              alt={`${companyName} logo`}
              className="size-9 shrink-0 border-white/20 bg-white/10"
              fallbackClassName="size-9 shrink-0 border-white/20 bg-white/10 text-white"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-indigo-100">{companyName}</p>
              <p className="truncate text-sm font-bold">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full p-0 hover:bg-white/10"
                  />
                }
              >
                <Avatar className="size-8 ring-2 ring-white/30">
                  <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
                    {initials(userName, userEmail)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/me/profile" />}>Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    void logoutAction();
                  }}
                >
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isHome ? (
          <div>
            <p className="text-sm text-indigo-100">{greeting}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{firstName}</h1>
          </div>
        ) : (
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        )}
      </div>
    </header>
  );
}

export function EmployeeDesktopSidebar({
  userName,
  userEmail,
  companyName,
  logoUrl,
}: {
  userName: string;
  userEmail: string;
  companyName: string;
  logoUrl?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <CompanyLogo
            logoUrl={logoUrl}
            alt={`${companyName} logo`}
            className="size-10"
            fallbackClassName="size-10 border-indigo-500/30 bg-indigo-500/10 text-indigo-600"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{companyName}</p>
            <p className="truncate text-xs text-muted-foreground">Employee portal</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {EMPLOYEE_NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            void logoutAction();
          }}
        >
          <LogOutIcon className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
