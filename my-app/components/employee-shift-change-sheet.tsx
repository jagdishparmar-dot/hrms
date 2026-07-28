'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowLeftRightIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { submitMyShiftChangeRequestAction } from '@/lib/appwrite/employee-portal-actions';
import type { MobileTodayShift } from '@/lib/appwrite/mobile-shifts';
import { cn } from '@/lib/utils';

export type ShiftCatalogItem = {
  id: string;
  name: string;
  code: string;
  shiftType: string;
  startTime: string;
  endTime: string;
};

export type ShiftChangePreset = {
  dateIso?: string;
  requestedShiftId?: string;
  sequence?: number;
};

export function EmployeeShiftChangeSheet({
  open,
  onOpenChange,
  todayIso,
  currentShifts,
  catalog,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayIso: string;
  currentShifts: MobileTodayShift[];
  catalog: ShiftCatalogItem[];
  preset?: ShiftChangePreset | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dateIso, setDateIso] = useState(todayIso);
  const [sequence, setSequence] = useState(1);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDateIso(preset?.dateIso ?? todayIso);
    setSequence(preset?.sequence ?? currentShifts[0]?.sequence ?? 1);
    setSelectedShiftId(preset?.requestedShiftId ?? '');
    setReason('');
    setError(null);
  }, [open, preset, todayIso, currentShifts]);

  const currentShiftLabel = useMemo(() => {
    const match = currentShifts.find((shift) => shift.sequence === sequence);
    if (match) {
      return `${match.name}${match.code ? ` (${match.code})` : ''} · ${match.windowLabel}`;
    }
    return 'Default / not rostered yet';
  }, [currentShifts, sequence]);

  const handleSubmit = () => {
    if (!selectedShiftId) {
      setError('Select the shift you want to work.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Provide a brief reason (at least 3 characters).');
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set('dateIso', dateIso);
      fd.set('requestedShiftId', selectedShiftId);
      fd.set('reason', reason.trim());
      fd.set('sequence', String(sequence));
      const result = await submitMyShiftChangeRequestAction(fd);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Shift change request submitted');
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-border/60 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2"
        showCloseButton
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="px-0 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ArrowLeftRightIcon className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg">Request shift change</SheetTitle>
              <SheetDescription className="text-sm">
                HR will review your request. Once approved, your roster and punch windows
                update for that date.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="shift-date">Date</Label>
            <Input
              id="shift-date"
              type="date"
              min={todayIso}
              value={dateIso}
              onChange={(event) => setDateIso(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {currentShifts.length > 1 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Shift slot</p>
              <div className="flex flex-wrap gap-2">
                {currentShifts.map((shift) => (
                  <button
                    key={`${shift.shiftId}-${shift.sequence}`}
                    type="button"
                    onClick={() => setSequence(shift.sequence)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      sequence === shift.sequence
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-border bg-muted/30 text-muted-foreground',
                    )}
                  >
                    #{shift.sequence} {shift.code || shift.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Current assignment</p>
            <p className="mt-1 text-sm font-semibold">{currentShiftLabel}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Requested shift</p>
            {catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active shifts configured. Contact HR.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {catalog.map((shift) => {
                  const active = selectedShiftId === shift.id;
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                        active
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-border/60 bg-card hover:bg-muted/30',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{shift.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shift.code ? `${shift.code} · ` : ''}
                          {shift.startTime} – {shift.endTime}
                        </p>
                      </div>
                      {active ? (
                        <CheckCircle2Icon className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="shift-reason">Reason</Label>
            <Textarea
              id="shift-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why do you need this shift change?"
              className="min-h-24 rounded-xl"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <SheetFooter className="mt-4 flex-row gap-2 px-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit request'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
