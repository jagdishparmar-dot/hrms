'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRightIcon,
  ChevronRightIcon,
  FilePenLineIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  EmployeeRegularizationSheet,
  type RegularizationPreset,
} from '@/components/employee-regularization-sheet';
import {
  EmployeeShiftChangeSheet,
  type ShiftCatalogItem,
} from '@/components/employee-shift-change-sheet';
import { formatDuration } from '@/lib/attendance-export';
import type {
  AttendanceRecord,
  AttendanceRegularization,
  ShiftChangeRequest,
} from '@/lib/appwrite/types';
import type { MobileTodayShiftsPayload } from '@/lib/appwrite/mobile-shifts';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<string, string> = {
  PRESENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  HALF_DAY: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  ABSENT: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  ON_LEAVE: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  LEAVE_PENDING: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

const REQUEST_STATUS_TONE: Record<string, string> = {
  pending: 'text-amber-600 dark:text-amber-400',
  approved: 'text-emerald-600 dark:text-emerald-400',
  rejected: 'text-rose-600 dark:text-rose-400',
};

function requestStatusLabel(status: string) {
  return status.toUpperCase();
}

export function EmployeeAttendanceView({
  records,
  regularizations,
  shiftChangeRequests,
  todayIso,
  schedule,
  shiftCatalog,
}: {
  records: AttendanceRecord[];
  regularizations: AttendanceRegularization[];
  shiftChangeRequests: ShiftChangeRequest[];
  todayIso: string;
  schedule: MobileTodayShiftsPayload;
  shiftCatalog: ShiftCatalogItem[];
}) {
  const [regularizationOpen, setRegularizationOpen] = useState(false);
  const [shiftChangeOpen, setShiftChangeOpen] = useState(false);
  const [regularizationPreset, setRegularizationPreset] = useState<RegularizationPreset | null>(
    null,
  );

  const pendingRegularizations = useMemo(
    () => regularizations.filter((item) => item.status === 'pending').length,
    [regularizations],
  );
  const pendingShiftChanges = useMemo(
    () => shiftChangeRequests.filter((item) => item.status === 'pending').length,
    [shiftChangeRequests],
  );

  const openRegularization = (preset?: RegularizationPreset | null) => {
    setRegularizationPreset(preset ?? null);
    setRegularizationOpen(true);
  };

  const openRecordRegularization = (record: AttendanceRecord) => {
    const existing = regularizations.find((item) => item.dateIso === record.dateIso);
    openRegularization({
      dateIso: record.dateIso,
      requestedClockIn: record.clockInTime || undefined,
      requestedClockOut: record.clockOutTime || undefined,
      requestedOutDateIso: existing?.requestedOutDateIso || undefined,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => setShiftChangeOpen(true)}
          >
            <ArrowLeftRightIcon className="size-4" />
            Shift change
            {pendingShiftChanges > 0 ? (
              <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px]">
                {pendingShiftChanges}
              </Badge>
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => openRegularization()}
          >
            <FilePenLineIcon className="size-4" />
            Regularize
            {pendingRegularizations > 0 ? (
              <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-[10px]">
                {pendingRegularizations}
              </Badge>
            ) : null}
          </Button>
        </div>

        {regularizations.length > 0 ? (
          <RequestList
            title="Regularization requests"
            items={regularizations.slice(0, 4).map((item) => ({
              id: item.id,
              dateIso: item.dateIso,
              reason: item.reason,
              status: item.status,
            }))}
          />
        ) : null}

        {shiftChangeRequests.length > 0 ? (
          <RequestList
            title="Shift change requests"
            items={shiftChangeRequests.slice(0, 4).map((item) => ({
              id: item.id,
              dateIso: item.dateIso,
              reason: item.reason,
              status: item.status,
            }))}
          />
        ) : null}

        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="font-semibold">Activity log</p>
              <p className="text-xs text-muted-foreground">Tap a day to request regularization</p>
            </div>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">
              {records.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {records.map((record) => (
              <AttendanceCard
                key={record.id}
                record={record}
                regularizations={regularizations}
                onPress={() => openRecordRegularization(record)}
              />
            ))}
            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No attendance records yet.
              </div>
            ) : null}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">In</th>
                    <th className="px-4 py-3 font-medium">Out</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const openShift = Boolean(record.clockInTime) && !record.clockOutTime;
                    return (
                      <tr key={record.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 font-medium tabular-nums">{record.dateIso}</td>
                        <td className="px-4 py-3 tabular-nums">{record.clockInTime || '—'}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {openShift ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Open</span>
                          ) : (
                            record.clockOutTime || '—'
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatDuration(record.totalMinutes)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{record.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openRecordRegularization(record)}
                          >
                            Regularize
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {records.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No attendance records yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <EmployeeRegularizationSheet
        open={regularizationOpen}
        onOpenChange={setRegularizationOpen}
        todayIso={todayIso}
        preset={regularizationPreset}
      />
      <EmployeeShiftChangeSheet
        open={shiftChangeOpen}
        onOpenChange={setShiftChangeOpen}
        todayIso={todayIso}
        currentShifts={schedule.shifts}
        catalog={shiftCatalog}
      />
    </>
  );
}

function RequestList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; dateIso: string; reason: string; status: string }>;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold tabular-nums">{item.dateIso}</p>
              <p className="truncate text-sm text-muted-foreground">{item.reason}</p>
            </div>
            <span
              className={cn(
                'shrink-0 text-xs font-bold',
                REQUEST_STATUS_TONE[item.status] || 'text-muted-foreground',
              )}
            >
              {requestStatusLabel(item.status)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttendanceCard({
  record,
  regularizations,
  onPress,
}: {
  record: AttendanceRecord;
  regularizations: AttendanceRegularization[];
  onPress: () => void;
}) {
  const openShift = Boolean(record.clockInTime) && !record.clockOutTime;
  const existingReg = regularizations.find((item) => item.dateIso === record.dateIso);

  return (
    <button
      type="button"
      onClick={onPress}
      className="rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/20 active:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold tabular-nums">{record.dateIso}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDuration(record.totalMinutes)} logged
          </p>
        </div>
        <Badge variant="outline" className={cn('border-0', STATUS_TONE[record.status] || '')}>
          {record.status.replaceAll('_', ' ')}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">In</p>
          <p className="mt-0.5 font-semibold tabular-nums">{record.clockInTime || '—'}</p>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Out</p>
          <p
            className={cn(
              'mt-0.5 font-semibold tabular-nums',
              openShift && 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {openShift ? 'Open' : record.clockOutTime || '—'}
          </p>
        </div>
      </div>
      {existingReg ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Regularization · {existingReg.status.toUpperCase()}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        <span>
          {existingReg?.status === 'pending'
            ? 'Submit another request'
            : 'Request regularization'}
        </span>
        <ChevronRightIcon className="size-4" />
      </div>
    </button>
  );
}
