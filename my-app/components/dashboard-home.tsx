import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock3,
  FileCheck,
  Palmtree,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { attendanceStatusClass } from "@/lib/dashboard";
import { formatAttendanceTime } from "@/lib/attendance-export";
import { cn, getInitials } from "@/lib/utils";

type TenantInfo = {
  companyName: string;
  role: string;
  userName: string;
};

function CompactStat({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "indigo",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const toneClass = {
    indigo:
      "border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400",
    emerald:
      "border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber:
      "border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    rose: "border-rose-200/80 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
    sky: "border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400",
    violet:
      "border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
  }[tone];

  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-xs transition-colors hover:bg-accent/30"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
          toneClass,
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        {hint ? (
          <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function AttendanceMixBar({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { attendance, employees } = snapshot;
  const total = Math.max(employees.active, 1);
  const segments = [
    { key: "present", value: attendance.present, className: "bg-emerald-500" },
    { key: "late", value: attendance.late, className: "bg-amber-500" },
    { key: "halfDay", value: attendance.halfDay, className: "bg-indigo-500" },
    { key: "onLeave", value: attendance.onLeave, className: "bg-sky-500" },
    { key: "absent", value: attendance.absent, className: "bg-rose-500" },
    {
      key: "unmarked",
      value: attendance.unmarked,
      className: "bg-slate-400/60 dark:bg-slate-600/60",
    },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn("h-full transition-all", segment.className)}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.key}: ${segment.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <LegendDot className="bg-emerald-500" label={`Present ${attendance.present}`} />
        <LegendDot className="bg-amber-500" label={`Late ${attendance.late}`} />
        <LegendDot className="bg-indigo-500" label={`Half day ${attendance.halfDay}`} />
        <LegendDot className="bg-sky-500" label={`Leave ${attendance.onLeave}`} />
        <LegendDot className="bg-rose-500" label={`Absent ${attendance.absent}`} />
        <LegendDot
          className="bg-slate-400/60"
          label={`Not marked ${attendance.unmarked}`}
        />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}

export function DashboardHome({
  snapshot,
  tenant,
}: {
  snapshot: DashboardSnapshot;
  tenant: TenantInfo;
}) {
  const formattedDate = new Date(`${snapshot.today}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const typeEntries = Object.entries(snapshot.employees.byType).sort((a, b) => b[1] - a[1]);
  const maxType = typeEntries[0]?.[1] || 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-indigo-600/90 via-indigo-700 to-slate-900 px-5 py-5 text-white shadow-lg sm:px-6">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-200/90">
              {tenant.companyName}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Good day, {tenant.userName.split(" ")[0]}
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-indigo-100/90">
              <CalendarDays className="size-4" />
              {formattedDate}
              <span className="text-indigo-300/80">·</span>
              <span className="capitalize">{tenant.role.replaceAll("_", " ")}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="border-white/10 bg-white/10 text-white hover:bg-white/20"
              nativeButton={false}
              render={<Link href="/employees" />}
            >
              Employees
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="border-white/10 bg-white/10 text-white hover:bg-white/20"
              nativeButton={false}
              render={<Link href="/attendance" />}
            >
              Attendance
            </Button>
            <Button
              size="sm"
              className="bg-white text-indigo-900 hover:bg-indigo-50"
              nativeButton={false}
              render={<Link href="/leave" />}
            >
              Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <CompactStat
          label="Active"
          value={snapshot.employees.active}
          hint="Headcount"
          icon={Users}
          href="/employees"
          tone="indigo"
        />
        <CompactStat
          label="Present"
          value={snapshot.attendance.present}
          hint="On time"
          icon={UserCheck}
          href="/attendance"
          tone="emerald"
        />
        <CompactStat
          label="Late"
          value={snapshot.attendance.late}
          hint="Today"
          icon={AlertTriangle}
          href="/attendance"
          tone="amber"
        />
        <CompactStat
          label="Absent"
          value={snapshot.attendance.absent}
          hint="Marked"
          icon={UserX}
          href="/attendance"
          tone="rose"
        />
        <CompactStat
          label="On leave"
          value={snapshot.leave.onLeaveToday}
          hint="Approved today"
          icon={Palmtree}
          href="/leave"
          tone="sky"
        />
        <CompactStat
          label="Open shifts"
          value={snapshot.attendance.openShifts}
          hint="Still in"
          icon={Clock3}
          href="/attendance"
          tone="violet"
        />
        <CompactStat
          label="Leave queue"
          value={snapshot.leave.pending}
          hint="Pending"
          icon={CalendarDays}
          href="/leave"
          tone="sky"
        />
        <CompactStat
          label="Regularize"
          value={snapshot.regularizationsPending}
          hint="Pending"
          icon={FileCheck}
          href="/attendance"
          tone="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today&apos;s attendance mix</CardTitle>
              <CardDescription>
                {snapshot.attendance.marked} of {snapshot.employees.active} employees marked · shift
                date {snapshot.today}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceMixBar snapshot={snapshot} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-xs">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">On duty now</CardTitle>
                <CardDescription>{snapshot.onDutyNow.length} open punches</CardDescription>
              </CardHeader>
              <CardContent className="max-h-64 space-y-2 overflow-y-auto p-3">
                {snapshot.onDutyNow.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No one is currently punched in.
                  </p>
                ) : (
                  snapshot.onDutyNow.map((row) => (
                    <Link
                      key={`${row.employeeId}-${row.clockInTime}`}
                      href={`/employees/${row.employeeId}`}
                      className="flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-muted/40 dark:hover:border-slate-800"
                    >
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                          {getInitials(row.employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.employeeName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.siteName} · in {row.clockInTime}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", attendanceStatusClass(row.status))}
                      >
                        {row.status}
                      </Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Pending leave</CardTitle>
                    <CardDescription>Awaiting approval</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/leave" />}>
                    View
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-64 space-y-2 overflow-y-auto p-3">
                {snapshot.leave.pendingItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No pending leave requests.
                  </p>
                ) : (
                  snapshot.leave.pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-muted/15 px-3 py-2.5"
                    >
                      <p className="truncate text-sm font-medium">{item.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.leaveTypeName} · {item.days}d · {item.fromDate}
                        {item.toDate !== item.fromDate ? ` → ${item.toDate}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden py-0 shadow-xs">
            <CardHeader className="border-b py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Recent punches</CardTitle>
                  <CardDescription>Latest activity across the company</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/attendance" />}
                >
                  All attendance
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.recent.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4 py-2.5 font-medium">
                        {row.employeeName}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {row.dateIso}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatAttendanceTime(row.clockInTime)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatAttendanceTime(row.clockOutTime)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", attendanceStatusClass(row.status))}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate pr-4 text-muted-foreground">
                        {row.locationName || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {snapshot.recent.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-20 text-center text-muted-foreground"
                      >
                        No punches yet. Assign sites and use mobile check-in.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workforce</CardTitle>
              <CardDescription>Active employee breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Active" value={snapshot.employees.active} />
                <MiniStat label="Inactive" value={snapshot.employees.inactive} />
                <MiniStat label="Invited" value={snapshot.employees.invited} />
              </div>
              {typeEntries.length > 0 ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Employment type
                  </p>
                  {typeEntries.map(([type, count]) => (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{type}</span>
                        <span className="tabular-nums font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-indigo-500/80"
                          style={{ width: `${(count / maxType) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">On leave today</CardTitle>
              <CardDescription>{snapshot.leave.onLeaveTodayItems.length} approved</CardDescription>
            </CardHeader>
            <CardContent className="max-h-56 space-y-2 overflow-y-auto p-3">
              {snapshot.leave.onLeaveTodayItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No approved leave for today.
                </p>
              ) : (
                snapshot.leave.onLeaveTodayItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 rounded-lg px-1 py-1.5">
                    <Palmtree className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.leaveTypeName}
                        {item.toDate !== item.fromDate
                          ? ` · until ${item.toDate}`
                          : " · today"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Needs attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AttentionRow
                label="Unmarked attendance"
                value={snapshot.attendance.unmarked}
                href="/attendance"
                tone={snapshot.attendance.unmarked > 0 ? "amber" : "muted"}
              />
              <AttentionRow
                label="Late arrivals"
                value={snapshot.attendance.late}
                href="/attendance"
                tone={snapshot.attendance.late > 0 ? "amber" : "muted"}
              />
              <AttentionRow
                label="Pending regularizations"
                value={snapshot.regularizationsPending}
                href="/attendance"
                tone={snapshot.regularizationsPending > 0 ? "rose" : "muted"}
              />
              <AttentionRow
                label="Inactive employees"
                value={snapshot.employees.inactive}
                href="/employees"
                tone="muted"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function AttentionRow({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "amber" | "rose" | "muted";
}) {
  const valueClass =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "rose"
        ? "text-rose-700 dark:text-rose-300"
        : "text-muted-foreground";

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-transparent px-2 py-2 text-sm transition-colors hover:border-slate-200 hover:bg-muted/30 dark:hover:border-slate-800"
    >
      <span className="flex items-center gap-2 text-muted-foreground">
        <UserMinus className="size-3.5" />
        {label}
      </span>
      <span className={cn("font-semibold tabular-nums", valueClass)}>{value}</span>
    </Link>
  );
}
