"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { FormSelect } from "@/components/form-fields";
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
  importShiftRosterCsvAction,
  upsertShiftAssignmentAction,
} from "@/lib/appwrite/phase1-actions";
import type {
  EmployeeMembership,
  EmployeeShiftAssignment,
  WorkShift,
} from "@/lib/appwrite/types";
import { formatShiftWindowLabel } from "@/lib/attendance-shift";
import { shiftRosterCsvTemplate } from "@/lib/shift-roster-import";

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
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeShifts = useMemo(
    () => shifts.filter((shift) => shift.status === "active"),
    [shifts],
  );
  const templateSample = useMemo(() => {
    const employeeCode =
      employees.find((employee) => employee.employeeCode)?.employeeCode || "EMP0001";
    return shiftRosterCsvTemplate({
      employeeCode,
      shiftCodes: activeShifts.map((shift) => shift.code),
    });
  }, [activeShifts, employees]);

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

  function downloadTemplate() {
    const blob = new Blob([templateSample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shift-roster-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function uploadCsv(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Select a CSV file to upload.");
      return;
    }

    startTransition(async () => {
      setImportErrors([]);
      const result = await importShiftRosterCsvAction(formData);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (!result.ok) {
        if (result.errors?.length) {
          setImportErrors(result.errors);
        }
        toast.error(result.error);
        return;
      }

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      const parts = [
        result.created ? `${result.created} created` : null,
        result.updated ? `${result.updated} updated` : null,
        result.cleared ? `${result.cleared} cleared` : null,
        result.failed ? `${result.failed} skipped` : null,
      ].filter(Boolean);

      toast.success(
        parts.length > 0
          ? `Imported ${result.totalRows} row(s): ${parts.join(", ")}`
          : "Roster CSV processed.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Shift roster views
          </p>
          <p className="text-sm font-medium">Assignments & import</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled>
            Assignments
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/shifts/roster/monthly" />}
          >
            Monthly matrix
          </Button>
        </div>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Import roster from CSV</CardTitle>
          <CardDescription>
            Bulk-assign shifts using employee code, shift code, and date. Existing
            employee-date-sequence rows are updated; use{" "}
            <code className="text-xs">OFF</code> as shift code to clear a slot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
            <p className="font-medium text-foreground">Template columns</p>
            <p className="mt-1 font-mono">
              employee_code, shift_code, date, sequence, note
            </p>
            {activeShifts.length > 0 ? (
              <p className="mt-2">
                Active shift codes:{" "}
                {activeShifts.map((shift) => shift.code).join(" · ")}
              </p>
            ) : (
              <p className="mt-2 text-amber-700 dark:text-amber-300">
                Add active shifts in the shift catalog before importing.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="size-4" />
              Download template
            </Button>

            <form
              className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
              action={uploadCsv}
            >
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="rosterCsv">CSV file</Label>
                <Input
                  ref={fileInputRef}
                  id="rosterCsv"
                  name="file"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  disabled={pending || activeShifts.length === 0}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={pending || activeShifts.length === 0}
              >
                <Upload className="size-4" />
                {pending ? "Importing…" : "Upload CSV"}
              </Button>
            </form>
          </div>

          {importErrors.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Import warnings
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-800 dark:text-amber-200">
                {importErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
            <FormSelect
              name="employeeId"
              label="Employee"
              required
              placeholder="Select employee"
              options={employees.map((employee) => ({
                value: employee.id,
                label: `${employee.name} (${employee.employeeCode || "—"})`,
              }))}
              className="sm:col-span-2"
            />
            <div className="grid gap-1.5">
              <Label htmlFor="dateIso">Date</Label>
              <Input id="dateIso" name="dateIso" type="date" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sequence">Sequence</Label>
              <Input id="sequence" name="sequence" type="number" min={1} max={10} defaultValue={1} />
            </div>
            <FormSelect
              name="shiftId"
              label="Shift"
              required
              placeholder="Select shift"
              options={activeShifts.map((shift) => ({
                value: shift.id,
                label: `${shift.name} · ${formatShiftWindowLabel(shift)}`,
              }))}
              className="sm:col-span-2"
            />
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
            <FormSelect
              name="employeeId"
              label="Employee"
              required
              placeholder="Select employee"
              options={employees.map((employee) => ({
                value: employee.id,
                label: employee.name,
              }))}
              className="sm:col-span-2"
            />
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
    </div>
  );
}
