import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, isPlatformAdminEmail } from "@/lib/appwrite/auth";
import { COMPANY_COOKIE } from "@/lib/appwrite/config";
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
    if (companyId || memberships.length === 1) redirect("/dashboard");
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
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-300">
            <Sparkles className="size-3.5 text-rose-500 dark:text-rose-400" />
            Admin sign-in
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in with your company admin or employee account to continue.
            </p>
          </div>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        <p className="border-t border-slate-200 pt-4 text-center text-[11px] leading-relaxed text-slate-500 dark:border-slate-800">
          Protected workspace · Credentials are verified server-side ·{" "}
          <span className="font-mono">tenant-scoped access</span>
        </p>
      </div>
    </AuthShell>
  );
}
