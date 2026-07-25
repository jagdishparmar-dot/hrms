"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteShiftAssignmentAction,
  generateRotationalRosterAction,
  upsertShiftAssignmentAction,
} from "@/lib/appwrite/phase1-actions";
import type {
  EmployeeMembership,
  EmployeeShiftAssignment,
  WorkShift,
} from "@/lib/appwrite/types";
import { formatShiftWindowLabel } from "@/lib/attendance-shift";

const selectClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ShiftRoster({
  assignments,
  employees,
  shifts,
}: {
  assignments: EmployeeShiftAssignment[];
  employees: EmployeeMembership[];
  shifts: WorkShift[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeShifts = useMemo(
    () => shifts.filter((shift) => shift.status === "active"),
    [shifts],
  );

  function saveAssignment(formData: FormData) {
    startTransition(async () => {
      const result = await upsertShiftAssignmentAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Roster entry saved");
      router.refresh();
    });
  }

  function generateRoster(formData: FormData) {
    startTransition(async () => {
      const result = await generateRotationalRosterAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Generated ${result.created} roster day(s)`);
      router.refresh();
    });
  }

  function removeAssignment(assignmentId: string) {
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    startTransition(async () => {
      const result = await deleteShiftAssignmentAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Assignment removed");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-sm">Assign shift to a day</CardTitle>
          <CardDescription>
            Supports multi-shift days via sequence (1, 2, …). Punch resolution prefers
            roster over the employee default shift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" action={saveAssignment}>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="employeeId">Employee</Label>
              <select
                id="employeeId"
                name="employeeId"
                required
                className={selectClassName}
                defaultValue=""
              >
                <option value="" disabled>
                  Select employee
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employeeCode || "—"})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dateIso">Date</Label>
              <Input id="dateIso" name="dateIso" type="date" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sequence">Sequence</Label>
              <Input id="sequence" name="sequence" type="number" min={1} max={10} defaultValue={1} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="shiftId">Shift</Label>
              <select id="shiftId" name="shiftId" required className={selectClassName} defaultValue="">
                <option value="" disabled>
                  Select shift
                </option>
                {activeShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} · {formatShiftWindowLabel(shift)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending || activeShifts.length === 0}>
                {pending ? "Saving…" : "Add assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-sm">Generate rotational calendar</CardTitle>
          <CardDescription>
            Pattern is a repeating comma-separated list of shift IDs. Use{" "}
            <code className="text-xs">OFF</code> for off days in the cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="grid gap-3 sm:grid-cols-2" action={generateRoster}>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="genEmployeeId">Employee</Label>
              <select
                id="genEmployeeId"
                name="employeeId"
                required
                className={selectClassName}
                defaultValue=""
              >
                <option value="" disabled>
                  Select employee
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="days">Days</Label>
              <Input id="days" name="days" type="number" min={1} max={62} defaultValue={14} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="pattern">Pattern (shift ids)</Label>
              <Input
                id="pattern"
                name="pattern"
                required
                placeholder={
                  activeShifts[0]
                    ? `${activeShifts[0].id},OFF,${activeShifts[0].id}`
                    : "shiftId,OFF,shiftId"
                }
              />
              {activeShifts.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Available:{" "}
                  {activeShifts.map((s) => `${s.code}=${s.id}`).join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" disabled={pending}>
                Generate roster
              </Button>
            </div>
          </form>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Scheduled assignments</h3>
            {assignments.length === 0 ? (
              <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                No roster entries yet. Assign a night shift for a specific date or generate a cycle.
              </p>
            ) : (
              assignments.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {row.employeeName || row.employeeId} · {row.dateIso}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {row.shiftName || row.shiftId}
                      {row.shiftCode ? ` (${row.shiftCode})` : ""} · seq {row.sequence}
                      {row.note ? ` · ${row.note}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => removeAssignment(row.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
