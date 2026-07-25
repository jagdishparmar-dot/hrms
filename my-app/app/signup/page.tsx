import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/appwrite/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell
      contentClassName="mx-auto flex w-full max-w-md flex-col justify-center space-y-8 px-6 py-16 sm:px-0"
      topLink={
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground">
            Login
          </Link>
        </div>
      }
    >
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-medium">Create your company</h1>
        <p className="text-sm text-muted-foreground">
          Self-serve tenant signup — you become Company Admin.
        </p>
      </div>
      <SignupForm />
    </AuthShell>
  );
}
