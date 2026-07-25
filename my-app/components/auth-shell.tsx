import { Command } from "lucide-react";
import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";

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
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <Command className="size-10" />
            <h1 className="text-2xl font-medium">CheckIn</h1>
            <p className="text-sm">Attendance, leave, and payroll for your team.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Built for HR ops</h2>
              <p className="text-sm">
                Manage employees, geofenced check-ins, leave approvals, and payroll from one admin portal.
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Need a company?</h2>
              <p className="text-sm">
                Sign up to create a tenant, invite your team, and start tracking attendance in minutes.
              </p>
            </div>
          </div>
        </div>

        <div className="relative order-1 flex h-full">
          {topLink ? (
            <div className="absolute top-5 z-10 flex w-full justify-end px-6 sm:px-10">
              {topLink}
            </div>
          ) : null}
          <div
            className={
              contentClassName ??
              "mx-auto flex w-full flex-col justify-center space-y-8 px-6 sm:w-[350px] sm:px-0"
            }
          >
            {children}
          </div>
          <div className="absolute bottom-5 flex w-full justify-between px-6 text-sm text-muted-foreground sm:px-10">
            <div>© {new Date().getFullYear()} CheckIn</div>
          </div>
        </div>
      </div>
    </main>
  );
}
