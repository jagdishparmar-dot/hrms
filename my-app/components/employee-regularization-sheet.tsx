'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { FilePenLineIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { submitMyRegularizationAction } from '@/lib/appwrite/employee-portal-actions';
import { cn } from '@/lib/utils';

export type RegularizationPreset = {
  dateIso: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  requestedOutDateIso?: string;
};

function addDaysIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function EmployeeRegularizationSheet({
  open,
  onOpenChange,
  todayIso,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayIso: string;
  preset?: RegularizationPreset | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dateIso, setDateIso] = useState(todayIso);
  const [outDateIso, setOutDateIso] = useState(todayIso);
  const [crossDayOut, setCrossDayOut] = useState(false);
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = preset?.dateIso ?? todayIso;
    const outBase = preset?.requestedOutDateIso ?? preset?.dateIso ?? todayIso;
    setDateIso(base);
    setOutDateIso(outBase);
    setCrossDayOut(Boolean(preset?.requestedOutDateIso && preset.requestedOutDateIso !== base));
    setClockIn(preset?.requestedClockIn ?? '');
    setClockOut(preset?.requestedClockOut ?? '');
    setReason('');
  }, [open, preset, todayIso]);

  const canSubmit = reason.trim().length >= 3;

  const handleSubmit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('dateIso', dateIso);
      fd.set('reason', reason.trim());
      if (clockIn) fd.set('requestedClockIn', clockIn);
      if (clockOut) fd.set('requestedClockOut', clockOut);
      if (clockOut && (crossDayOut || outDateIso !== dateIso)) {
        fd.set('requestedOutDateIso', outDateIso);
      }
      const result = await submitMyRegularizationAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Regularization submitted');
      onOpenChange(false);
      router.refresh();
    });
  };

  const overnightHint = useMemo(() => {
    if (!crossDayOut) return null;
    return `Punch-out will be recorded on ${outDateIso}.`;
  }, [crossDayOut, outDateIso]);

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
              <FilePenLineIcon className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg">Request adjustment</SheetTitle>
              <SheetDescription className="text-sm">
                Correct a missed punch or wrong clock-in/out for a specific day.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="reg-date">Shift date</Label>
            <Input
              id="reg-date"
              type="date"
              max={todayIso}
              value={dateIso}
              onChange={(event) => {
                const next = event.target.value;
                setDateIso(next);
                if (!crossDayOut) setOutDateIso(next);
              }}
              className="h-11 rounded-xl"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
            <Checkbox
              checked={crossDayOut}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setCrossDayOut(enabled);
                if (!enabled) {
                  setOutDateIso(dateIso);
                } else {
                  setOutDateIso(addDaysIso(dateIso, 1));
                }
              }}
            />
            <span className="text-sm leading-snug">
              Punch-out on next calendar day (overnight shift)
            </span>
          </label>

          {crossDayOut ? (
            <div className="grid gap-1.5">
              <Label htmlFor="reg-out-date">Punch-out date</Label>
              <Input
                id="reg-out-date"
                type="date"
                max={todayIso}
                value={outDateIso}
                onChange={(event) => setOutDateIso(event.target.value)}
                className="h-11 rounded-xl"
              />
              {overnightHint ? (
                <p className="text-xs text-muted-foreground">{overnightHint}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Requested times (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="reg-in">Clock in</Label>
                <Input
                  id="reg-in"
                  type="time"
                  value={clockIn}
                  onChange={(event) => setClockIn(event.target.value)}
                  className="h-11 rounded-xl"
                />
                {clockIn ? (
                  <button
                    type="button"
                    className="text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    onClick={() => setClockIn('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reg-out">Clock out</Label>
                <Input
                  id="reg-out"
                  type="time"
                  value={clockOut}
                  onChange={(event) => setClockOut(event.target.value)}
                  className="h-11 rounded-xl"
                />
                {clockOut ? (
                  <button
                    type="button"
                    className="text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    onClick={() => setClockOut('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="reg-reason">Reason</Label>
            <Textarea
              id="reg-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe what needs correction (min. 3 characters)"
              className="min-h-24 rounded-xl"
            />
          </div>
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
            className={cn('h-11 flex-1 rounded-xl', !canSubmit && 'opacity-60')}
            disabled={pending || !canSubmit}
            onClick={handleSubmit}
          >
            {pending ? 'Submitting…' : 'Submit'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
