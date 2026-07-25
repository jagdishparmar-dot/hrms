import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isPlatformAdminEmail } from "@/lib/appwrite/auth";
import { COMPANY_COOKIE } from "@/lib/appwrite/config";
import { listMembershipsForUser } from "@/lib/appwrite/tenant";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to your CheckIn HR admin account to manage employees, attendance, and payroll.",
  path: "/login",
});

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
        <div className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground">
            Register
          </Link>
        </div>
      }
    >
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-medium">Login to your account</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your company admin or employee account.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
