import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getCurrentTenantContext,
  isPlatformAdminEmail,
  requirePlatformAdmin,
} from "@/lib/appwrite/auth";
import { isCompanyAdminRole } from "@/lib/appwrite/types";

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
      };
      isAdmin = isCompanyAdminRole(ctx.membership.role);
    }
  } else {
    const ctx = await getCurrentTenantContext();
    if (!ctx) redirect("/login");
    if (ctx.membership.mustChangePassword) redirect("/change-password");

    company = {
      name: ctx.company.name,
      plan: ctx.company.plan,
      slug: ctx.company.slug,
    };
    user = {
      name: ctx.user.name || ctx.membership.name || ctx.user.email || "User",
      email: ctx.user.email || "",
      role: ctx.membership.role,
    };
    isAdmin = isCompanyAdminRole(ctx.membership.role);
    showPlatform = isPlatformAdminEmail(ctx.user.email || "");
  }

  return (
    <SidebarProvider
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
      />
      <SidebarInset className="min-w-0 overflow-x-clip [--dashboard-header-height:--spacing(12)]">
        <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background/50 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <div className="min-w-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="truncate font-medium">
                        {title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                {subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 md:gap-6 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
