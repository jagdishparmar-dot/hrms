import {
  inferCrossesMidnight,
  minutesFromHhMm,
} from "@/lib/attendance-shift";
import type { WorkShift } from "@/lib/appwrite/types";

export type ShiftScenarioPreset = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftType: WorkShift["shiftType"];
  lateGraceMinutes: number;
  /** Recommended catalog values when creating this shift. */
  recommended: {
    punchInBeforeMinutes: number;
    punchInAfterMinutes: number;
    punchOutBeforeMinutes: number;
    punchOutAfterMinutes: number;
    earlyLeaveGraceMinutes: number;
    fullDayMinutes: number;
    halfDayMinutes: number;
    overtimeAfterMinutes: number;
  };
  testCases: {
    id: string;
    label: string;
    shiftDateIso: string;
    punchInTime: string;
    punchOutTime: string;
    notes?: string;
  }[];
};

export function shiftSpanMinutes(startTime: string, endTime: string): number {
  const crossesMidnight = inferCrossesMidnight(startTime, endTime);
  const start = minutesFromHhMm(startTime);
  const end = minutesFromHhMm(endTime);
  if (crossesMidnight) return end - start + 24 * 60;
  return end - start;
}

function preset(
  code: string,
  name: string,
  startTime: string,
  endTime: string,
  shiftType: WorkShift["shiftType"],
  testCases: ShiftScenarioPreset["testCases"],
  options?: { punchOutAfterMinutes?: number },
): ShiftScenarioPreset {
  const span = shiftSpanMinutes(startTime, endTime);
  const punchOutAfterMinutes = options?.punchOutAfterMinutes ?? 240;
  return {
    code,
    name,
    startTime,
    endTime,
    shiftType,
    lateGraceMinutes: 15,
    recommended: {
      punchInBeforeMinutes: 120,
      punchInAfterMinutes: 240,
      punchOutBeforeMinutes: 120,
      punchOutAfterMinutes: punchOutAfterMinutes,
      earlyLeaveGraceMinutes: 15,
      fullDayMinutes: span,
      halfDayMinutes: Math.max(60, Math.floor(span / 2)),
      overtimeAfterMinutes: span,
    },
    testCases,
  };
}

/** Reference fixtures matching common rotational shift catalog entries. */
export const SHIFT_SCENARIO_PRESETS: ShiftScenarioPreset[] = [
  preset("ASHIFT", "A Shift", "08:00", "16:30", "general", [
    {
      id: "a-on-time",
      label: "On-time start",
      shiftDateIso: "2026-07-28",
      punchInTime: "08:00",
      punchOutTime: "16:30",
      notes: "Standard day shift — business date = calendar date.",
    },
    {
      id: "a-late",
      label: "Late arrival (20 min)",
      shiftDateIso: "2026-07-28",
      punchInTime: "08:20",
      punchOutTime: "16:30",
      notes: "After 08:15 grace → marked LATE on punch-in.",
    },
    {
      id: "a-early-in",
      label: "Early punch-in (2 h before)",
      shiftDateIso: "2026-07-28",
      punchInTime: "06:00",
      punchOutTime: "16:30",
      notes: "Within default in-window-before (120 min) from 08:00.",
    },
  ]),
  preset("BSHIFT", "B Shift", "16:00", "00:30", "cross_midnight", [
    {
      id: "b-on-time",
      label: "On-time start",
      shiftDateIso: "2026-07-28",
      punchInTime: "16:00",
      punchOutTime: "00:30",
      notes: "Business date stays 2026-07-28; punch-out is next calendar day.",
    },
    {
      id: "b-post-midnight-out",
      label: "Punch-out after midnight",
      shiftDateIso: "2026-07-28",
      punchInTime: "16:00",
      punchOutTime: "00:45",
      notes: "Checkout on 2026-07-29 still belongs to 2026-07-28 shift record.",
    },
    {
      id: "b-overlap-a",
      label: "Overlap with A Shift end",
      shiftDateIso: "2026-07-28",
      punchInTime: "16:00",
      punchOutTime: "00:30",
      notes: "A Shift runs 08:00–16:30; B starts 16:00. Roster assignment decides which shift applies.",
    },
  ]),
  preset("GENERAL", "GENERAL", "09:00", "18:00", "general", [
    {
      id: "gen-standard",
      label: "Standard office day",
      shiftDateIso: "2026-07-28",
      punchInTime: "09:00",
      punchOutTime: "18:00",
    },
    {
      id: "gen-half-day",
      label: "Half-day duration",
      shiftDateIso: "2026-07-28",
      punchInTime: "09:00",
      punchOutTime: "13:00",
      notes: "Worked ~4 h — below half-day threshold if fullDay=540, halfDay=270.",
    },
  ]),
  preset("12HDAY", "12H-Day", "09:00", "21:00", "general", [
    {
      id: "12d-full",
      label: "Full 12 h shift",
      shiftDateIso: "2026-07-28",
      punchInTime: "09:00",
      punchOutTime: "21:00",
      notes: "720 min span — verify fullDayMinutes=720 in catalog.",
    },
    {
      id: "12d-late",
      label: "Late start",
      shiftDateIso: "2026-07-28",
      punchInTime: "09:30",
      punchOutTime: "21:00",
    },
  ]),
  preset("12HNIGHT", "12H-Night", "21:00", "09:00", "cross_midnight", [
    {
      id: "12n-standard",
      label: "Night span",
      shiftDateIso: "2026-07-28",
      punchInTime: "21:00",
      punchOutTime: "09:00",
      notes: "Punch-out on 2026-07-29 morning; increase out-window-after if checkout rejected.",
    },
    {
      id: "12n-morning-out",
      label: "Morning checkout",
      shiftDateIso: "2026-07-28",
      punchInTime: "21:00",
      punchOutTime: "09:15",
      notes: "15 min after scheduled end — should succeed with default out-window-after 240.",
    },
  ], { punchOutAfterMinutes: 360 }),
];

export function presetToWorkShift(
  presetDef: ShiftScenarioPreset,
  companyId = "scenario",
): WorkShift {
  const crossesMidnight = inferCrossesMidnight(presetDef.startTime, presetDef.endTime);
  return {
    id: presetDef.code,
    companyId,
    name: presetDef.name,
    code: presetDef.code,
    shiftType: presetDef.shiftType,
    startTime: presetDef.startTime,
    endTime: presetDef.endTime,
    crossesMidnight,
    ...presetDef.recommended,
    lateGraceMinutes: presetDef.lateGraceMinutes,
    status: "active",
  };
}

export function findPresetForCode(code: string): ShiftScenarioPreset | undefined {
  return SHIFT_SCENARIO_PRESETS.find(
    (p) => p.code.toUpperCase() === code.toUpperCase(),
  );
}
