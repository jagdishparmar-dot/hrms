import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { MobileAppDownloadQr } from "@/components/mobile-app-download-qr";
import { getCurrentUser, isPlatformAdminEmail, redirectBrokenTenantSession } from "@/lib/appwrite/auth";
import { COMPANY_COOKIE } from "@/lib/appwrite/config";
import { tenantHomePath } from "@/lib/appwrite/routing";
import { listMembershipsForUser } from "@/lib/appwrite/tenant";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to your CheckIn HR admin account to manage employees, attendance, and payroll.",
  path: "/login",
});

function LoginFormFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800/60" />
      <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
      <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
      <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
    </div>
  );
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    const memberships = await listMembershipsForUser(user.$id);
    const jar = await cookies();
    const companyId = jar.get(COMPANY_COOKIE)?.value;
    if (isPlatformAdminEmail(user.email || "") && memberships.length === 0) {
      redirect("/platform");
    }
    if (companyId) {
      const selected = memberships.find((membership) => membership.companyId === companyId);
      if (selected) redirect(tenantHomePath(selected.role));
      redirect("/select-company");
    }
    if (memberships.length === 1) redirect(tenantHomePath(memberships[0]!.role));
    if (memberships.length > 1) redirect("/select-company");
  }

  return (
    <AuthShell
      topLink={
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Register company
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <div className="space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Same email and password your company set up for you — works on the web and
              the mobile app.
            </p>
          </div>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
        </div>

        <MobileAppDownloadQr />
      </div>
    </AuthShell>
  );
}
