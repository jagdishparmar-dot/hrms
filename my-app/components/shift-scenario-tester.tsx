"use client";

import { useMemo, useState } from "react";
import { FlaskConicalIcon, PlayIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  addDaysIso,
  buildShiftOccurrence,
  computePunchInStatus,
  finalizeAttendanceOnPunchOut,
  formatShiftWindowLabel,
  hhMmFromTimestamp,
  resolvePunchInOccurrence,
  zonedDateTimeToUtcMs,
} from "@/lib/attendance-shift";
import type { WorkShift } from "@/lib/appwrite/types";
import {
  findPresetForCode,
  SHIFT_SCENARIO_PRESETS,
  type ShiftScenarioPreset,
} from "@/lib/shift-scenarios";
import { cn } from "@/lib/utils";

function formatTs(ms: number, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
  return date.replace(",", "");
}

function StatusBadge({ value, tone }: { value: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        tone === "bad" && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
      )}
    >
      {value}
    </Badge>
  );
}

function simulateScenario(
  shift: WorkShift,
  shiftDateIso: string,
  punchInTime: string,
  punchOutTime: string,
  timeZone: string,
) {
  const punchInMs = zonedDateTimeToUtcMs(shiftDateIso, punchInTime, timeZone);
  const occurrence = buildShiftOccurrence(shift, shiftDateIso, timeZone);

  const inWindowOk =
    punchInMs >= occurrence.punchInWindowStartMs &&
    punchInMs <= occurrence.punchInWindowEndMs;

  const resolved = resolvePunchInOccurrence(shift, punchInMs, timeZone);
  const punchInStatus = inWindowOk && resolved
    ? computePunchInStatus(punchInMs, resolved)
    : null;

  let punchOutMs = zonedDateTimeToUtcMs(shiftDateIso, punchOutTime, timeZone);
  let punchOutDateIso = shiftDateIso;
  if (occurrence.isOvernight && punchOutMs <= punchInMs) {
    punchOutDateIso = addDaysIso(shiftDateIso, 1);
    punchOutMs = zonedDateTimeToUtcMs(punchOutDateIso, punchOutTime, timeZone);
  }

  const outWindowOk =
    punchOutMs >= occurrence.punchOutWindowStartMs &&
    punchOutMs <= occurrence.punchOutWindowEndMs;

  const finalize =
    inWindowOk && outWindowOk && punchOutMs > punchInMs
      ? finalizeAttendanceOnPunchOut({
          punchInStatus: punchInStatus ?? "PRESENT",
          clockInTimestamp: punchInMs,
          clockOutTimestamp: punchOutMs,
          occurrence,
        })
      : null;

  return {
    occurrence,
    punchInMs,
    punchOutMs,
    punchOutDateIso,
    inWindowOk,
    outWindowOk,
    resolved: Boolean(resolved),
    punchInStatus,
    finalize,
  };
}

export function ShiftScenarioTester({
  shifts,
  timeZone,
}: {
  shifts: WorkShift[];
  timeZone: string;
}) {
  const scenarioShifts = useMemo(() => {
    const codes = SHIFT_SCENARIO_PRESETS.map((p) => p.code.toUpperCase());
    const fromCatalog = shifts.filter((s) =>
      codes.includes(s.code.toUpperCase()),
    );
    if (fromCatalog.length > 0) return fromCatalog;
    return SHIFT_SCENARIO_PRESETS.map((p) => ({
      id: p.code,
      companyId: "fixture",
      name: p.name,
      code: p.code,
      shiftType: p.shiftType,
      startTime: p.startTime,
      endTime: p.endTime,
      crossesMidnight: p.shiftType === "cross_midnight",
      lateGraceMinutes: p.lateGraceMinutes,
      ...p.recommended,
      status: "active" as const,
    }));
  }, [shifts]);

  const [shiftId, setShiftId] = useState(scenarioShifts[0]?.id ?? "");
  const [shiftDateIso, setShiftDateIso] = useState("2026-07-28");
  const [punchInTime, setPunchInTime] = useState("08:00");
  const [punchOutTime, setPunchOutTime] = useState("16:30");

  const selectedShift =
    scenarioShifts.find((s) => s.id === shiftId) ?? scenarioShifts[0];

  const preset = selectedShift
    ? findPresetForCode(selectedShift.code)
    : undefined;

  const result = selectedShift
    ? simulateScenario(
        selectedShift,
        shiftDateIso,
        punchInTime,
        punchOutTime,
        timeZone,
      )
    : null;

  function loadTestCase(testCase: ShiftScenarioPreset["testCases"][number]) {
    setShiftDateIso(testCase.shiftDateIso);
    setPunchInTime(testCase.punchInTime);
    setPunchOutTime(testCase.punchOutTime);
  }

  function selectShift(shift: WorkShift) {
    setShiftId(shift.id);
    const p = findPresetForCode(shift.code);
    const firstCase = p?.testCases[0];
    if (firstCase) {
      loadTestCase(firstCase);
    } else {
      setPunchInTime(shift.startTime);
      setPunchOutTime(shift.endTime);
    }
  }

  if (!selectedShift || !result) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No scenario shifts found. Create ASHIFT, BSHIFT, GENERAL, 12HDAY, and 12HNIGHT in the
          shift catalog first.
        </CardContent>
      </Card>
    );
  }

  const { occurrence, inWindowOk, outWindowOk, punchInStatus, finalize } = result;

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConicalIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
            Shift scenarios
          </CardTitle>
          <CardDescription>
            Simulate punch-in/out against catalog shifts using company timezone ({timeZone}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Select shift</Label>
            <div className="flex flex-col gap-1.5">
              {scenarioShifts.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => selectShift(shift)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    shift.id === selectedShift.id
                      ? "border-indigo-500/40 bg-indigo-500/5"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div className="font-medium">
                    {shift.name}{" "}
                    <span className="text-muted-foreground text-xs">({shift.code})</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatShiftWindowLabel(shift)} · {shift.shiftType.replaceAll("_", " ")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {preset?.testCases.length ? (
            <div className="flex flex-col gap-2">
              <Label>Quick test cases</Label>
              <div className="flex flex-wrap gap-2">
                {preset.testCases.map((testCase) => (
                  <Button
                    key={testCase.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => loadTestCase(testCase)}
                  >
                    <PlayIcon className="size-3" />
                    {testCase.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="shiftDate">Shift business date</Label>
              <Input
                id="shiftDate"
                type="date"
                value={shiftDateIso}
                onChange={(e) => setShiftDateIso(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchIn">Punch-in time</Label>
              <Input
                id="punchIn"
                type="time"
                value={punchInTime}
                onChange={(e) => setPunchInTime(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="punchOut">Punch-out time</Label>
              <Input
                id="punchOut"
                type="time"
                value={punchOutTime}
                onChange={(e) => setPunchOutTime(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 xl:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shift windows</CardTitle>
            <CardDescription>
              Business date {occurrence.shiftDateIso} · scheduled{" "}
              {hhMmFromTimestamp(occurrence.scheduledStartMs, timeZone)} –{" "}
              {hhMmFromTimestamp(occurrence.scheduledEndMs, timeZone)}
              {occurrence.isOvernight ? " (next calendar day)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <WindowTile
              title="Punch-in allowed"
              from={formatTs(occurrence.punchInWindowStartMs, timeZone)}
              to={formatTs(occurrence.punchInWindowEndMs, timeZone)}
            />
            <WindowTile
              title="Punch-out allowed"
              from={formatTs(occurrence.punchOutWindowStartMs, timeZone)}
              to={formatTs(occurrence.punchOutWindowEndMs, timeZone)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Simulation result</CardTitle>
            <CardDescription>
              Punch-in {shiftDateIso} {punchInTime} → punch-out{" "}
              {result.punchOutDateIso} {punchOutTime}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                value={inWindowOk ? "Punch-in allowed" : "Punch-in rejected"}
                tone={inWindowOk ? "ok" : "bad"}
              />
              <StatusBadge
                value={outWindowOk ? "Punch-out allowed" : "Punch-out rejected"}
                tone={outWindowOk ? "ok" : "bad"}
              />
              {punchInStatus ? (
                <StatusBadge
                  value={punchInStatus}
                  tone={punchInStatus === "LATE" ? "warn" : "ok"}
                />
              ) : null}
            </div>

            {finalize ? (
              <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Metric label="Final status" value={finalize.status} />
                  <Metric label="Total minutes" value={String(finalize.totalMinutes)} />
                  <Metric
                    label="Early departure"
                    value={finalize.earlyDeparture ? "Yes" : "No"}
                  />
                  <Metric label="Overtime (min)" value={String(finalize.overtimeMinutes)} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Final attendance is computed only when both punch-in and punch-out fall inside
                their windows and punch-out is after punch-in.
              </p>
            )}

            {preset?.testCases.find(
              (t) =>
                t.shiftDateIso === shiftDateIso &&
                t.punchInTime === punchInTime &&
                t.punchOutTime === punchOutTime,
            )?.notes ? (
              <p className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-muted-foreground">
                {
                  preset.testCases.find(
                    (t) =>
                      t.shiftDateIso === shiftDateIso &&
                      t.punchInTime === punchInTime &&
                      t.punchOutTime === punchOutTime,
                  )?.notes
                }
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Catalog check</CardTitle>
            <CardDescription>
              Compare your catalog values against recommended settings for this shift type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preset ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">Catalog</th>
                      <th className="px-3 py-2 font-medium">Recommended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <CatalogRow
                      label="Full day (min)"
                      actual={selectedShift.fullDayMinutes}
                      recommended={preset.recommended.fullDayMinutes}
                    />
                    <CatalogRow
                      label="Half day (min)"
                      actual={selectedShift.halfDayMinutes}
                      recommended={preset.recommended.halfDayMinutes}
                    />
                    <CatalogRow
                      label="Out window after"
                      actual={selectedShift.punchOutAfterMinutes}
                      recommended={preset.recommended.punchOutAfterMinutes}
                    />
                    <CatalogRow
                      label="Cross-midnight"
                      actual={selectedShift.crossesMidnight ? "Yes" : "No"}
                      recommended={
                        preset.shiftType === "cross_midnight" ? "Yes" : "No"
                      }
                    />
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No preset reference for code {selectedShift.code}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WindowTile({
  title,
  from,
  to,
}: {
  title: string;
  from: string;
  to: string;
}) {
  return (
    <div className="rounded-xl border px-3 py-2.5">
      <div className="text-xs font-medium">{title}</div>
      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{from}</div>
      <div className="font-mono text-[11px] text-muted-foreground">→ {to}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function CatalogRow({
  label,
  actual,
  recommended,
}: {
  label: string;
  actual: number | string;
  recommended: number | string;
}) {
  const match = String(actual) === String(recommended);
  return (
    <tr>
      <td className="px-3 py-2 font-medium">{label}</td>
      <td className="px-3 py-2 font-mono">{actual}</td>
      <td className={cn("px-3 py-2 font-mono", !match && "text-amber-700 dark:text-amber-300")}>
        {recommended}
        {!match ? " ⚠" : ""}
      </td>
    </tr>
  );
}
