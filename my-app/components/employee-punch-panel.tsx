'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MapPinIcon,
  TimerIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { punchWebAction } from '@/lib/appwrite/employee-portal-actions';
import type { AttendanceRecord, ShiftChangeRequest } from '@/lib/appwrite/types';
import type { MobileTodayShiftsPayload } from '@/lib/appwrite/mobile-shifts';
import { cn } from '@/lib/utils';
import {
  EmployeeShiftChangeSheet,
  type ShiftCatalogItem,
} from '@/components/employee-shift-change-sheet';

type PunchPortalState = {
  todayIso: string;
  timezone: string;
  attendancePolicy: string;
  todayRecord: AttendanceRecord | null;
  openRecord: AttendanceRecord | null;
  schedule: MobileTodayShiftsPayload;
  employeeName: string;
  officeLocation: string;
  shiftChangeRequests: ShiftChangeRequest[];
  pendingShiftChanges: number;
};

function readBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 60_000,
    });
  });
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatLiveClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}

function formatLiveDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(date);
}

export function EmployeePunchPanel({
  initial,
  shiftCatalog,
}: {
  initial: PunchPortalState;
  shiftCatalog: ShiftCatalogItem[];
}) {
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());
  const [shiftChangeOpen, setShiftChangeOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeOpenRecord = useMemo(() => {
    return (
      state.openRecord ??
      (state.todayRecord?.clockInTime && !state.todayRecord.clockOutTime
        ? state.todayRecord
        : null)
    );
  }, [state.openRecord, state.todayRecord]);

  const isClockedIn = Boolean(activeOpenRecord);
  const isCompleted = Boolean(
    state.todayRecord?.clockOutTime && !state.openRecord,
  );
  const openFromPriorDay =
    Boolean(state.openRecord) && state.openRecord?.dateIso !== state.todayIso;
  const selfPunchDisabled = state.attendancePolicy === 'manual';
  const primaryShift = state.schedule.shifts[0];

  const handlePunch = () => {
    startTransition(async () => {
      try {
        const position = await readBrowserLocation();
        const type = isClockedIn ? 'out' : 'in';
        const result = await punchWebAction({
          type,
          lat: position.coords.latitude,
          long: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message);
        setState((prev) => {
          const record = result.record;
          const recordsMatchToday = record.dateIso === prev.todayIso;
          const nextToday = recordsMatchToday ? record : prev.todayRecord;
          const stillOpen = record.clockInTime && !record.clockOutTime;
          return {
            ...prev,
            todayRecord: nextToday,
            openRecord: stillOpen ? record : null,
          };
        });
      } catch (error) {
        const message =
          error instanceof GeolocationPositionError
            ? error.code === error.PERMISSION_DENIED
              ? 'Location permission is required to punch in/out.'
              : 'Unable to read GPS location. Try again near a window or outdoors.'
            : error instanceof Error
              ? error.message
              : 'Punch failed.';
        toast.error(message);
      }
    });
  };

  const status = isCompleted
    ? {
        label: 'Completed',
        hint: 'Shift closed for today',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
        icon: CheckCircle2Icon,
      }
    : isClockedIn
      ? {
          label: 'On duty',
          hint: openFromPriorDay
            ? `Open shift · ${state.openRecord?.dateIso}`
            : activeOpenRecord?.clockInTime
              ? `Since ${activeOpenRecord.clockInTime}`
              : 'Shift in progress',
          className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          icon: TimerIcon,
        }
      : {
          label: 'Off duty',
          hint: selfPunchDisabled ? 'Self punch disabled' : 'Tap to clock in',
          className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
          icon: TimerIcon,
        };

  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col gap-4">
      {openFromPriorDay ? (
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Open shift from {state.openRecord?.dateIso}</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-100/90">
              Clock out that shift before punching in for today.
            </p>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Live time
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight">
              {formatLiveClock(now, state.timezone)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatLiveDate(now, state.timezone)}
            </p>
          </div>
          <div
            className={cn(
              'inline-flex max-w-[45%] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
              status.className,
            )}
          >
            <StatusIcon className="size-3.5" />
            <span className="truncate">{status.label}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{status.hint}</p>
      </section>

      {primaryShift ? (
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Today&apos;s shift
          </p>
          <p className="mt-1 text-base font-bold">{primaryShift.name}</p>
          <p className="text-sm text-muted-foreground">
            {primaryShift.windowLabel} · {primaryShift.dateIso}
          </p>
          <button
            type="button"
            onClick={() => setShiftChangeOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-indigo-500/25 bg-card/80 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-500/10 dark:text-indigo-300"
          >
            <span>
              Request shift change
              {state.pendingShiftChanges > 0
                ? ` · ${state.pendingShiftChanges} pending`
                : ''}
            </span>
            <span aria-hidden>›</span>
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Today&apos;s attendance</p>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="In" value={state.todayRecord?.clockInTime || '—'} />
          <Metric
            label="Out"
            value={
              state.todayRecord?.clockOutTime ||
              (isClockedIn && !openFromPriorDay ? 'Active' : '—')
            }
            highlight={isClockedIn}
          />
          <Metric
            label="Total"
            value={
              state.todayRecord?.totalMinutes
                ? formatMinutes(state.todayRecord.totalMinutes)
                : '0h 0m'
            }
          />
        </div>
      </section>

      <section className="flex flex-col items-center gap-4 py-2">
        <button
          type="button"
          disabled={pending || selfPunchDisabled || (isCompleted && !openFromPriorDay)}
          onClick={handlePunch}
          className={cn(
            'relative flex size-44 items-center justify-center rounded-full border-4 bg-card shadow-xl transition-transform active:scale-[0.98] disabled:opacity-60 sm:size-48',
            isClockedIn
              ? 'border-emerald-500 shadow-emerald-500/20'
              : isCompleted
                ? 'border-muted shadow-none'
                : 'border-indigo-500 shadow-indigo-500/25',
          )}
          aria-label={isClockedIn ? 'Clock out' : 'Clock in'}
        >
          <span
            className={cn(
              'absolute inset-2 rounded-full opacity-20',
              isClockedIn ? 'bg-emerald-500' : 'bg-indigo-500',
            )}
          />
          <span className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
            {pending ? (
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <TimerIcon
                className={cn(
                  'size-8',
                  isClockedIn
                    ? 'text-emerald-600'
                    : isCompleted
                      ? 'text-muted-foreground'
                      : 'text-indigo-600',
                )}
              />
            )}
            <span className="text-sm font-bold leading-tight">
              {pending
                ? 'Processing…'
                : isClockedIn
                  ? 'Clock out'
                  : isCompleted
                    ? 'Done for today'
                    : 'Clock in'}
            </span>
          </span>
        </button>
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          {selfPunchDisabled
            ? 'Self punch is disabled for your account. Contact HR.'
            : state.attendancePolicy === 'gps_logged'
              ? 'GPS is recorded on each punch.'
              : 'You must be within your assigned site geofence.'}
        </p>
      </section>

      <section className="flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-indigo-600" />
        <span>
          {state.officeLocation || 'Assigned site'} · Browser location is used for punch
          verification on web.
        </span>
      </section>

      <EmployeeShiftChangeSheet
        open={shiftChangeOpen}
        onOpenChange={setShiftChangeOpen}
        todayIso={state.todayIso}
        currentShifts={state.schedule.shifts}
        catalog={shiftCatalog}
        preset={{ dateIso: state.todayIso }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-sm font-bold tabular-nums',
          highlight && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </p>
    </div>
  );
}
