import { redirect } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { Sparkles } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { CompanyLogo } from "@/components/company-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getCurrentTenantContext,
  isPlatformAdminEmail,
  requireTenantMember,
  requirePlatformAdmin,
} from "@/lib/appwrite/auth";
import { isCompanyAdminRole } from "@/lib/appwrite/types";
import { cn } from "@/lib/utils";

export async function AdminShell({
  children,
  title,
  subtitle,
  action,
  mode = "tenant",
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  mode?: "tenant" | "platform";
}) {
  let company = {
    name: "Platform",
    plan: "console",
    slug: undefined as string | undefined,
    logoUrl: undefined as string | undefined,
  };
  let user = { name: "Admin", email: "", role: "platform_admin" };
  let isAdmin = true;
  let showPlatform = true;

  if (mode === "platform") {
    const platformUser = await requirePlatformAdmin();
    const ctx = await getCurrentTenantContext();
    user = {
      name: platformUser.name || platformUser.email || "Platform admin",
      email: platformUser.email || "",
      role: "platform_admin",
    };
    if (ctx) {
      company = {
        name: ctx.company.name,
        plan: ctx.company.plan,
        slug: ctx.company.slug,
        logoUrl: ctx.company.branding.logoUrl,
      };
      isAdmin = isCompanyAdminRole(ctx.membership.role);
    }
  } else {
    const ctx = await requireTenantMember();
    if (ctx.membership.mustChangePassword) redirect("/change-password");

    company = {
      name: ctx.company.name,
      plan: ctx.company.plan,
      slug: ctx.company.slug,
      logoUrl: ctx.company.branding.logoUrl,
    };
    user = {
      name: ctx.user.name || ctx.membership.name || ctx.user.email || "User",
      email: ctx.user.email || "",
      role: ctx.membership.role,
    };
    isAdmin = isCompanyAdminRole(ctx.membership.role);
    showPlatform = isPlatformAdminEmail(ctx.user.email || "");
  }

  const isPlatform = mode === "platform";
  const shellBadge = isPlatform
    ? "Platform console"
    : isAdmin
      ? "HRMS Portal"
      : "Employee Portal";
  const accentLine = isPlatform
    ? "from-transparent via-rose-500/50 to-transparent"
    : "from-transparent via-indigo-500/50 to-transparent";

  return (
    <SidebarProvider
      data-shell-mode={mode}
      className={cn("admin-shell min-h-svh bg-background selection:bg-primary/30")}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as CSSProperties
      }
    >
      <AppSidebar
        company={company}
        user={user}
        isAdmin={isAdmin}
        showPlatform={showPlatform}
        mode={mode}
      />
      <SidebarInset className="min-w-0 overflow-x-clip bg-background [--dashboard-header-height:--spacing(14)]">
        <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
          <div
            className={cn(
              "h-px w-full bg-linear-to-r",
              accentLine,
            )}
          />
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-2 lg:gap-3">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-muted hover:text-foreground" />
              <Separator
                orientation="vertical"
                className="mx-1 hidden h-5 sm:block"
              />
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo
                  logoUrl={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="hidden size-9 sm:flex"
                  fallbackClassName={cn(
                    "hidden size-9 sm:flex",
                    isPlatform
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                  )}
                />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                      {title}
                    </h1>
                    <span
                      className={cn(
                        "hidden rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider sm:inline-flex sm:items-center sm:gap-1",
                        isPlatform
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                          : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
                      )}
                    >
                      <Sparkles className="size-3" />
                      {shellBadge}
                    </span>
                  </div>
                  {subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle showLabel={false} />
              {action}
            </div>
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 md:gap-6 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
