"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SHIFT_FIELD_GUIDE,
  SHIFT_PRESETS,
  SHIFT_PUNCH_WINDOW_FORMULA,
} from "@/lib/help/shift-field-guide";
import { cn } from "@/lib/utils";

function GuideSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function ShiftCatalogGuideTrigger({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("text-muted-foreground hover:text-foreground", className)}
          aria-label="Shift creation guide"
          onClick={() => setOpen(true)}
        >
          <CircleHelp className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
        >
          <BookOpen className="size-4" />
          Guide
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Shift creation guide</DialogTitle>
                <DialogDescription>
                  How to choose start/end times, punch windows, and grace values for each field.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-8rem)] space-y-6 overflow-y-auto px-6 py-5">
            <GuideSection title="Before you start">
              <p className="text-sm text-muted-foreground">
                A shift defines when work is scheduled, when mobile punch-in/out is allowed, and
                how late arrival, early leave, half-day, and overtime are calculated. Attendance is
                always tied to the shift&apos;s business date (the date of scheduled start).
              </p>
            </GuideSection>

            <GuideSection title="Example shifts">
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="border-b bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Preset</th>
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Start</th>
                      <th className="px-3 py-2 font-medium">End</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {SHIFT_PRESETS.map((preset) => (
                      <tr key={preset.code}>
                        <td className="px-3 py-2 font-medium">{preset.name}</td>
                        <td className="px-3 py-2 font-mono">{preset.code}</td>
                        <td className="px-3 py-2">{preset.type}</td>
                        <td className="px-3 py-2 font-mono">{preset.start}</td>
                        <td className="px-3 py-2 font-mono">{preset.end}</td>
                        <td className="px-3 py-2 text-muted-foreground">{preset.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuideSection>

            <GuideSection title="Choosing start and end times">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>
                  <span className="text-foreground">Same-day shift:</span> end time is after start
                  (e.g. 09:00 → 18:00). Full-day minutes ≈ 540 for a 9 h span, or 480 for 8 h
                  excluding lunch if you track net hours.
                </li>
                <li>
                  <span className="text-foreground">Overnight shift:</span> end ≤ start (e.g.
                  16:00 → 02:00). Punch-out after midnight still belongs to the original shift date.
                  Increase &quot;Out window after&quot; so checkout remains valid past midnight.
                </li>
                <li>
                  Set <span className="text-foreground">Full day</span>,{" "}
                  <span className="text-foreground">Half day</span>, and{" "}
                  <span className="text-foreground">OT after</span> from the scheduled span in
                  minutes: (end − start), adding 24 h when overnight.
                </li>
              </ul>
            </GuideSection>

            <GuideSection title="Punch windows (how they work)">
              <div className="rounded-xl border bg-muted/20 px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
                <p>{SHIFT_PUNCH_WINDOW_FORMULA.punchIn}</p>
                <p>{SHIFT_PUNCH_WINDOW_FORMULA.punchOut}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Defaults (120 min before, 240 min after) suit most day shifts. Night shifts often
                need a larger &quot;Out window after&quot; (e.g. 360–480) so employees can punch out
                after midnight without the app rejecting the checkout.
              </p>
            </GuideSection>

            <GuideSection title="Field reference">
              <div className="space-y-2">
                {SHIFT_FIELD_GUIDE.map((item) => (
                  <div
                    key={item.field}
                    className="rounded-xl border px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{item.field}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        e.g. {item.example}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.help}</p>
                  </div>
                ))}
              </div>
            </GuideSection>

            <p className="text-xs text-muted-foreground">
              Full shift documentation is also available in{" "}
              <Link href="/help/shifts" className="text-indigo-600 underline underline-offset-2 dark:text-indigo-400">
                Help & Support → Shifts
              </Link>
              .
            </p>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
