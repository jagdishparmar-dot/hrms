"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardAdminQueues,
  DashboardLeaveItem,
} from "@/lib/dashboard";
import {
  reviewRegularizationAction,
  reviewShiftChangeRequestAction,
} from "@/lib/appwrite/phase1-actions";
import { cn } from "@/lib/utils";

function QueueCard({
  title,
  description,
  count,
  href,
  hrefLabel,
  icon: Icon,
  tone,
  emptyLabel,
  children,
}: {
  title: string;
  description: string;
  count: number;
  href: string;
  hrefLabel: string;
  icon: ComponentType<{ className?: string }>;
  tone: "rose" | "amber" | "sky";
  emptyLabel: string;
  children: ReactNode;
}) {
  const toneClass = {
    rose: "border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    amber:
      "border-amber-200/80 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    sky: "border-sky-200/80 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  }[tone];

  return (
    <Card
      className={cn(
        "shadow-xs",
        count > 0 && "ring-1 ring-inset",
        count > 0 && tone === "rose" && "ring-rose-200/80 dark:ring-rose-500/25",
        count > 0 && tone === "amber" && "ring-amber-200/80 dark:ring-amber-500/25",
        count > 0 && tone === "sky" && "ring-sky-200/80 dark:ring-sky-500/25",
      )}
    >
      <CardHeader className="border-b pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                toneClass,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums",
              count > 0 ? toneClass : "bg-muted text-muted-foreground",
            )}
          >
            {count}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-3">
        {count === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
        <Button
          size="sm"
          variant={count > 0 ? "default" : "outline"}
          className="w-full"
          nativeButton={false}
          render={<Link href={href} />}
        >
          {hrefLabel}
          <ArrowRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function QueueItem({
  title,
  meta,
  detail,
  onApprove,
  onReject,
  pending,
}: {
  title: string;
  meta: string;
  detail?: string;
  onApprove?: () => void;
  onReject?: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/15 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-[11px] text-muted-foreground">{meta}</p>
          {detail ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      </div>
      {onApprove && onReject ? (
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={onApprove}>
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardAdminQueues({
  queues,
  leavePending,
  leaveItems,
}: {
  queues: DashboardAdminQueues;
  leavePending: number;
  leaveItems: DashboardLeaveItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const totalActions =
    queues.regularizationsPending + queues.shiftChangesPending + leavePending;

  function reviewRegularization(id: string, decision: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("regularizationId", id);
    fd.set("decision", decision);
    startTransition(async () => {
      const result = await reviewRegularizationAction(fd);
      if (result && "ok" in result && result.ok === false) {
        toast.error(result.error || "Unable to review request");
        return;
      }
      toast.success(decision === "approved" ? "Regularization approved" : "Regularization rejected");
      router.refresh();
    });
  }

  function reviewShiftChange(id: string, decision: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("requestId", id);
    fd.set("decision", decision);
    startTransition(async () => {
      const result = await reviewShiftChangeRequestAction(fd);
      if (result && "ok" in result && result.ok === false) {
        toast.error(result.error || "Unable to review request");
        return;
      }
      toast.success(
        decision === "approved" ? "Shift change approved" : "Shift change rejected",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {totalActions > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            {totalActions} item{totalActions === 1 ? "" : "s"} waiting for your review
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
            Approve or reject below — roster and attendance update on approval.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <QueueCard
          title="Attendance regularizations"
          description="Punch corrections"
          count={queues.regularizationsPending}
          href="/attendance"
          hrefLabel="Open attendance queue"
          icon={FileCheck}
          tone="rose"
          emptyLabel="No pending regularization requests."
        >
          {queues.regularizationItems.map((item) => (
            <QueueItem
              key={item.id}
              title={item.employeeName}
              meta={`${item.dateIso} · in ${item.requestedClockIn || "—"} / out ${item.requestedClockOut || "—"}`}
              detail={item.reason}
              pending={pending}
              onApprove={() => reviewRegularization(item.id, "approved")}
              onReject={() => reviewRegularization(item.id, "rejected")}
            />
          ))}
          {queues.regularizationsPending > queues.regularizationItems.length ? (
            <p className="text-center text-[11px] text-muted-foreground">
              +{queues.regularizationsPending - queues.regularizationItems.length} more in
              attendance
            </p>
          ) : null}
        </QueueCard>

        <QueueCard
          title="Shift change requests"
          description="Mobile roster swaps"
          count={queues.shiftChangesPending}
          href="/shifts/roster"
          hrefLabel="Open shift roster"
          icon={CalendarClock}
          tone="amber"
          emptyLabel="No pending shift change requests."
        >
          {queues.shiftChangeItems.map((item) => (
            <QueueItem
              key={item.id}
              title={item.employeeName}
              meta={`${item.dateIso}${item.sequence > 1 ? ` · slot #${item.sequence}` : ""}`}
              detail={`${item.currentShiftLabel} → ${item.requestedShiftLabel}${item.reason ? ` · ${item.reason}` : ""}`}
              pending={pending}
              onApprove={() => reviewShiftChange(item.id, "approved")}
              onReject={() => reviewShiftChange(item.id, "rejected")}
            />
          ))}
          {queues.shiftChangesPending > queues.shiftChangeItems.length ? (
            <p className="text-center text-[11px] text-muted-foreground">
              +{queues.shiftChangesPending - queues.shiftChangeItems.length} more on roster
              page
            </p>
          ) : null}
        </QueueCard>

        <QueueCard
          title="Leave requests"
          description="Awaiting approval"
          count={leavePending}
          href="/leave"
          hrefLabel="Open leave queue"
          icon={ClipboardList}
          tone="sky"
          emptyLabel="No pending leave requests."
        >
          {leaveItems.map((item) => (
            <QueueItem
              key={item.id}
              title={item.employeeName}
              meta={`${item.leaveTypeName} · ${item.days}d · ${item.fromDate}${item.toDate !== item.fromDate ? ` → ${item.toDate}` : ""}`}
              pending={pending}
            />
          ))}
          {leavePending > leaveItems.length ? (
            <p className="text-center text-[11px] text-muted-foreground">
              +{leavePending - leaveItems.length} more on leave page
            </p>
          ) : null}
        </QueueCard>
      </div>
    </div>
  );
}
