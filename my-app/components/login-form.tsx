"use client";

import { Lock, Mail, RefreshCw, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/lib/appwrite/actions";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(urlError);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            const result = await loginAction(fd);
            if (result && !result.ok) {
              setError(result.error);
              return;
            }
            router.replace(next.startsWith("/") ? next : "/dashboard");
            router.refresh();
          } catch {
            /* NEXT_REDIRECT */
          }
        });
      }}
    >
      <input
        type="hidden"
        name="next"
        value={next.startsWith("/") ? next : "/dashboard"}
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <div className="text-sm font-bold">Sign in failed</div>
            <p className="mt-0.5 text-xs opacity-90">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Work email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="hr@company.com"
              className={cn("pl-9 font-mono")}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <span>Sign in to portal</span>
        )}
      </Button>
    </form>
  );
}
