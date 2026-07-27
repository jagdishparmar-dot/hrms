"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Download, Upload } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

function patternPlaceholder(shifts: WorkShift[]) {
  if (shifts.length === 0) return "ASHIFT,OFF,BSHIFT";
  if (shifts.length === 1) return `${shifts[0]!.code},OFF,${shifts[0]!.code}`;
  return `${shifts[0]!.code},OFF,${shifts[1]!.code}`;
}

export function ShiftRoster({
  assignments,
  employees,
  shifts,
  dateRange,
}: {
  assignments: EmployeeShiftAssignment[];
  employees: EmployeeMembership[];
  shifts: WorkShift[];
  dateRange: { from: string; to: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeShifts = useMemo(
    () => shifts.filter((shift) => shift.status === "active"),
    [shifts],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        const byDate = a.dateIso.localeCompare(b.dateIso);
        if (byDate !== 0) return byDate;
        return (a.employeeName || a.employeeId).localeCompare(
          b.employeeName || b.employeeId,
        );
      }),
    [assignments],
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
          <p className="text-sm font-medium">
            {dateRange.from} → {dateRange.to}
          </p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assign shift to a day</CardTitle>
            <CardDescription className="text-xs">
              One employee, one date. Use sequence 2+ for split shifts on the same
              day.
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
                <Input
                  id="sequence"
                  name="sequence"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={1}
                />
              </div>
              <FormSelect
                name="shiftId"
                label="Shift"
                required
                placeholder="Select shift"
                options={activeShifts.map((shift) => ({
                  value: shift.id,
                  label: `${shift.code} · ${formatShiftWindowLabel(shift)}`,
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

        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generate rotational calendar</CardTitle>
            <CardDescription className="text-xs">
              Repeating cycle of shift codes for one employee. Use{" "}
              <code className="text-[11px]">OFF</code> for rest days in the pattern.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" action={generateRoster}>
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
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="days">Days to fill</Label>
                <Input
                  id="days"
                  name="days"
                  type="number"
                  min={1}
                  max={62}
                  defaultValue={14}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="pattern">Pattern (comma-separated codes)</Label>
                <Input
                  id="pattern"
                  name="pattern"
                  required
                  placeholder={patternPlaceholder(activeShifts)}
                  disabled={activeShifts.length === 0}
                />
                <p className="text-xs text-muted-foreground">
                  Example:{" "}
                  <span className="font-mono">{patternPlaceholder(activeShifts)}</span>
                  {activeShifts.length > 0 ? (
                    <>
                      {" "}
                      — {patternPlaceholder(activeShifts).split(",").length}-day cycle
                    </>
                  ) : null}
                </p>
              </div>
              {activeShifts.length > 0 ? (
                <Collapsible className="sm:col-span-2">
                  <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <ChevronDown className="size-3.5 transition-transform [[data-panel-open]_&]:rotate-180" />
                    Active shift codes ({activeShifts.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 overflow-hidden rounded-xl border bg-muted/20">
                    <ul className="divide-y text-xs">
                      {activeShifts.map((shift) => (
                        <li
                          key={shift.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="font-mono font-medium">{shift.code}</span>
                          <span className="truncate text-muted-foreground">
                            {shift.name} · {formatShiftWindowLabel(shift)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">
                  Add active shifts in the shift catalog before generating a roster.
                </p>
              )}
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={pending || activeShifts.length === 0}
                >
                  {pending ? "Generating…" : "Generate roster"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Scheduled assignments</CardTitle>
              <CardDescription className="text-xs">
                {sortedAssignments.length} entr
                {sortedAssignments.length === 1 ? "y" : "ies"} in this date range
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/shifts/roster/monthly" />}
            >
              <CalendarDays className="size-4" />
              Open monthly matrix
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedAssignments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No roster entries in {dateRange.from} → {dateRange.to}. Assign a shift
              above, generate a rotation, or import a CSV.
            </p>
          ) : (
            <div className="max-h-[min(28rem,60vh)] overflow-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="sticky top-0 z-10 border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Employee</th>
                    <th className="px-4 py-2.5 font-medium">Shift</th>
                    <th className="px-4 py-2.5 font-medium">Seq</th>
                    <th className="px-4 py-2.5 font-medium">Note</th>
                    <th className="px-4 py-2.5 text-right font-medium"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedAssignments.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                        {row.dateIso}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">
                          {row.employeeName || row.employeeId}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">
                          {row.shiftCode || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.shiftName || row.shiftId}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{row.sequence}</td>
                      <td className="max-w-[12rem] truncate px-4 py-2.5 text-xs text-muted-foreground">
                        {row.note || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => removeAssignment(row.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={importOpen} onOpenChange={setImportOpen}>
        <Card size="sm">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/15",
              importOpen && "border-b",
            )}
          >
            <div>
              <CardTitle className="text-sm">Import roster from CSV</CardTitle>
              <CardDescription className="mt-1 text-xs">
                Bulk upload by employee code · optional for large teams
              </CardDescription>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                importOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex flex-col gap-4 pt-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
                <p className="font-medium text-foreground">Columns</p>
                <p className="mt-1 font-mono">
                  employee_code, shift_code, date, sequence, note
                </p>
                {activeShifts.length > 0 ? (
                  <Collapsible className="mt-2">
                    <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                      <ChevronDown className="size-3 transition-transform [[data-panel-open]_&]:rotate-180" />
                      Valid shift codes
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1.5 font-mono text-foreground">
                      {activeShifts.map((shift) => shift.code).join(" · ")}
                    </CollapsibleContent>
                  </Collapsible>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
