"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  formatAttendanceTime,
  formatDuration,
} from "@/lib/attendance-export";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/appwrite/types";
import { cn, getInitials } from "@/lib/utils";

type StatusStyle = {
  bar: string;
  badge: string;
  label: string;
};

const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, StatusStyle> = {
  PRESENT: {
    bar: "bg-green-600 dark:bg-green-400",
    badge:
      "border-green-600/50 bg-green-50 text-green-600 dark:border-green-800/50 dark:bg-green-500/10 dark:text-green-400",
    label: "Present",
  },
  LATE: {
    bar: "bg-yellow-500 dark:bg-yellow-400",
    badge:
      "border-yellow-600/50 bg-yellow-50 text-yellow-700 dark:border-yellow-800/50 dark:bg-yellow-500/10 dark:text-yellow-300",
    label: "Late",
  },
  ABSENT: {
    bar: "bg-destructive",
    badge:
      "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/20",
    label: "Absent",
  },
  HALF_DAY: {
    bar: "bg-sky-500 dark:bg-sky-400",
    badge:
      "border-sky-600/50 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-500/10 dark:text-sky-300",
    label: "Half day",
  },
  ON_LEAVE: {
    bar: "bg-violet-500 dark:bg-violet-400",
    badge:
      "border-violet-600/50 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-500/10 dark:text-violet-300",
    label: "On leave",
  },
  LEAVE_PENDING: {
    bar: "bg-indigo-500 dark:bg-indigo-400",
    badge:
      "border-indigo-600/50 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-500/10 dark:text-indigo-300",
    label: "Leave pending",
  },
};

function formatRowDateLabel(row: AttendanceRecord) {
  const base = (() => {
    if (row.formattedDate) return row.formattedDate;
    if (row.dayOfWeek) return `${row.dayOfWeek}, ${row.dateIso}`;
    try {
      const date = new Date(`${row.dateIso}T12:00:00`);
      return date.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return row.dateIso;
    }
  })();
  return row.isOvernight ? `${base} · Overnight shift` : base;
}

function formatTimeRange(row: AttendanceRecord) {
  const clockIn = formatAttendanceTime(row.clockInTime);
  const clockOut = formatAttendanceTime(row.clockOutTime);
  const openShift = Boolean(row.clockInTime) && !row.clockOutTime;
  if (openShift) return `${clockIn} - Open`;
  return `${clockIn} - ${clockOut}`;
}

function rowSubtitle(row: AttendanceRecord) {
  const openShift = Boolean(row.clockInTime) && !row.clockOutTime;
  const parts = [
    row.employeeCode || null,
    row.locationName || null,
    openShift ? "Open shift" : formatDuration(row.totalMinutes),
    row.earlyDeparture ? "Early out" : null,
    row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m OT` : null,
    row.geofenceStatus !== "UNKNOWN" ? row.geofenceStatus : null,
  ].filter(Boolean);
  return parts.join(" • ");
}

export function AttendanceScheduleList({ rows }: { rows: AttendanceRecord[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No attendance rows for these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const openShift = Boolean(row.clockInTime) && !row.clockOutTime;
        const statusStyle =
          ATTENDANCE_STATUS_STYLES[row.status] ?? ATTENDANCE_STATUS_STYLES.PRESENT;
        const barClass = openShift
          ? "bg-amber-500 dark:bg-amber-400"
          : statusStyle.bar;

        return (
          <div
            key={row.id}
            className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[11rem_1fr_auto] sm:items-center"
          >
            <div className="flex gap-2">
              <div className={cn("w-1 shrink-0 rounded-md", barClass)} />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground tabular-nums">
                  {formatTimeRange(row)}
                </div>
                <div className="text-muted-foreground">{formatRowDateLabel(row)}</div>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Avatar size="sm" className="hidden shrink-0 font-medium sm:flex">
                <AvatarFallback>{getInitials(row.employeeName || "NA")}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                {row.employeeId ? (
                  <Link
                    href={`/employees/${row.employeeId}`}
                    className="truncate font-medium text-foreground text-sm leading-none hover:underline"
                  >
                    {row.employeeName || row.userId}
                  </Link>
                ) : (
                  <div className="truncate font-medium text-foreground text-sm leading-none">
                    {row.employeeName || row.userId}
                  </div>
                )}
                <div className="truncate text-muted-foreground text-xs leading-none">
                  {rowSubtitle(row)}
                </div>
              </div>
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 self-start rounded-md px-2.5 py-1 font-medium text-[10px] sm:self-center",
                openShift
                  ? "border-amber-600/50 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-300"
                  : statusStyle.badge,
              )}
            >
              {openShift ? "Open shift" : statusStyle.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
