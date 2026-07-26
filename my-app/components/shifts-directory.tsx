"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { ShiftCatalogGuideTrigger } from "@/components/shift-catalog-guide";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertShiftAction } from "@/lib/appwrite/phase1-actions";
import type { WorkShift } from "@/lib/appwrite/types";
import { formatShiftWindowLabel } from "@/lib/attendance-shift";

export function ShiftsDirectory({ shifts }: { shifts: WorkShift[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<WorkShift | null>(null);

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await upsertShiftAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Shift updated" : "Shift created");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-sm">
            {editing ? `Edit ${editing.name}` : "Add shift"}
          </CardTitle>
          <CardDescription>
            Define day, evening, night, and cross-midnight shifts with punch windows and grace.
          </CardDescription>
          <CardAction>
            <ShiftCatalogGuideTrigger />
          </CardAction>
        </CardHeader>
        <CardContent>
          <form
            key={editing?.id || "new"}
            className="grid gap-3 sm:grid-cols-2"
            action={save}
          >
            {editing ? <input type="hidden" name="shiftId" value={editing.id} /> : null}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editing?.name || ""}
                placeholder="Night operations"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={editing?.code || ""}
                placeholder="NIGHT"
              />
            </div>
            <FormSelect
              name="shiftType"
              label="Type"
              defaultValue={editing?.shiftType || "general"}
              options={[
                { value: "general", label: "General day" },
                { value: "evening", label: "Evening" },
                { value: "night", label: "Night" },
                { value: "cross_midnight", label: "Cross-midnight" },
                { value: "rotational", label: "Rotational" },
              ]}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="startTime">Start</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                required
                defaultValue={editing?.startTime || "09:00"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="endTime">End</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                required
                defaultValue={editing?.endTime || "18:00"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lateGraceMinutes">Late grace (min)</Label>
              <Input
                id="lateGraceMinutes"
                name="lateGraceMinutes"
                type="number"
                min={0}
                defaultValue={editing?.lateGraceMinutes ?? 15}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="earlyLeaveGraceMinutes">Early leave grace</Label>
              <Input
                id="earlyLeaveGraceMinutes"
                name="earlyLeaveGraceMinutes"
                type="number"
                min={0}
                defaultValue={editing?.earlyLeaveGraceMinutes ?? 15}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchInBeforeMinutes">In window before</Label>
              <Input
                id="punchInBeforeMinutes"
                name="punchInBeforeMinutes"
                type="number"
                min={0}
                defaultValue={editing?.punchInBeforeMinutes ?? 120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchInAfterMinutes">In window after</Label>
              <Input
                id="punchInAfterMinutes"
                name="punchInAfterMinutes"
                type="number"
                min={0}
                defaultValue={editing?.punchInAfterMinutes ?? 240}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchOutBeforeMinutes">Out window before</Label>
              <Input
                id="punchOutBeforeMinutes"
                name="punchOutBeforeMinutes"
                type="number"
                min={0}
                defaultValue={editing?.punchOutBeforeMinutes ?? 120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchOutAfterMinutes">Out window after</Label>
              <Input
                id="punchOutAfterMinutes"
                name="punchOutAfterMinutes"
                type="number"
                min={0}
                defaultValue={editing?.punchOutAfterMinutes ?? 240}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fullDayMinutes">Full day (min)</Label>
              <Input
                id="fullDayMinutes"
                name="fullDayMinutes"
                type="number"
                min={60}
                defaultValue={editing?.fullDayMinutes ?? 480}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="halfDayMinutes">Half day (min)</Label>
              <Input
                id="halfDayMinutes"
                name="halfDayMinutes"
                type="number"
                min={30}
                defaultValue={editing?.halfDayMinutes ?? 240}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="overtimeAfterMinutes">OT after (min)</Label>
              <Input
                id="overtimeAfterMinutes"
                name="overtimeAfterMinutes"
                type="number"
                min={60}
                defaultValue={editing?.overtimeAfterMinutes ?? 480}
              />
            </div>
            <FormSelect
              name="status"
              label="Status"
              defaultValue={editing?.status || "active"}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editing ? "Update shift" : "Create shift"}
              </Button>
              {editing ? (
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-sm">Shift catalog</CardTitle>
          <CardDescription>
            End time earlier than or equal to start time is treated as overnight (cross-midnight).
          </CardDescription>
          <CardAction>
            <ShiftCatalogGuideTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {shifts.length === 0 ? (
            <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              No shifts yet. Add a General Day (09:00–18:00) and a Night (16:00–02:00) shift to start.
            </p>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-3"
              >
                <div>
                  <div className="font-medium">
                    {shift.name}{" "}
                    <span className="text-muted-foreground text-xs">({shift.code})</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatShiftWindowLabel(shift)} · {shift.shiftType.replaceAll("_", " ")} · grace{" "}
                    {shift.lateGraceMinutes}m
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(shift)}>
                  Edit
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
