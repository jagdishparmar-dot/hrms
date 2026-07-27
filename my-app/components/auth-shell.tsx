import {
  Building2,
  Clock,
  Shield,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  children,
  topLink,
  contentClassName,
}: {
  children: ReactNode;
  topLink?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 selection:bg-indigo-500/30 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-linear-to-br from-slate-100 via-indigo-100/40 to-slate-50 lg:flex lg:flex-col lg:justify-between dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900">
          <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative z-10 space-y-6 p-10 pt-12">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Building2 className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  CheckIn
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  HR for teams on the ground
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Who&apos;s in, who&apos;s off, who&apos;s late — without chasing spreadsheets.
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                This is where admins set up people, shifts, and leave. Staff punch in from
                the phone app; you review everything here.
              </p>
            </div>

            <div className="grid max-w-lg gap-3 pt-2">
              {[
                {
                  icon: Users,
                  title: "People",
                  desc: "Onboard someone, update their details, reset a login when they forget.",
                  tone: "indigo" as const,
                },
                {
                  icon: Clock,
                  title: "Attendance",
                  desc: "Daily punches, shift roster, monthly register — export when payroll asks.",
                  tone: "emerald" as const,
                },
                {
                  icon: Shield,
                  title: "Roles",
                  desc: "Admins manage the company. Everyone else gets just their leave and profile.",
                  tone: "rose" as const,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div
                    className={`shrink-0 rounded-xl border p-2.5 ${
                      item.tone === "indigo"
                        ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : item.tone === "emerald"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <item.icon className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 border-t border-slate-200 p-10 dark:border-slate-800/80">
            <p className="text-xs text-slate-500">
              Questions? Ask your company admin — they manage access from here.
            </p>
          </div>
        </div>

        <div className="relative flex min-h-dvh flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 lg:hidden dark:border-slate-800">
            <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="size-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                CheckIn
              </div>
              <div className="text-[10px] text-slate-500">
                Sign in to your company
              </div>
            </div>
          </div>

          <div className="absolute top-5 right-0 z-10 flex w-full items-center justify-end gap-3 px-6 sm:px-10">
            <ThemeToggle showLabel={false} />
            {topLink}
          </div>

          <div
            className={
              contentClassName ??
              "mx-auto flex w-full flex-1 flex-col justify-center px-6 py-16 sm:max-w-md sm:px-0"
            }
          >
            {children}
          </div>

          <div className="flex w-full justify-between px-6 pb-5 text-xs text-slate-500 sm:px-10">
            <span>© {new Date().getFullYear()} CheckIn</span>
            <span className="hidden sm:inline">Need help? Talk to your admin.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
