export const SHIFT_PRESETS = [
  {
    name: "General day",
    code: "DAY",
    type: "General day",
    start: "09:00",
    end: "18:00",
    notes: "Standard 9-hour office shift. End is after start, so same calendar day.",
  },
  {
    name: "Evening",
    code: "EVE",
    type: "Evening",
    start: "14:00",
    end: "22:00",
    notes: "Afternoon start. Use evening type for reporting and roster colour coding.",
  },
  {
    name: "Night (cross-midnight)",
    code: "NIGHT",
    type: "Cross-midnight",
    start: "16:00",
    end: "02:00",
    notes: "End time is earlier than start — system treats this as overnight (+1 day).",
  },
] as const;

export const SHIFT_FIELD_GUIDE = [
  {
    field: "Name",
    example: "Night operations",
    help: "Human-readable label shown in roster, attendance, and employee assignment screens.",
  },
  {
    field: "Code",
    example: "NIGHT",
    help: "Short unique ID (1–32 chars). Used in roster imports and shift change requests. Keep it uppercase and memorable.",
  },
  {
    field: "Type",
    example: "Cross-midnight",
    help: "Classification for reporting and roster styling. Pick Cross-midnight when the shift spans midnight; Night or Evening for late starts that still end same day.",
  },
  {
    field: "Start / End",
    example: "09:00 / 18:00",
    help: "Scheduled work window. If end ≤ start (e.g. 16:00 → 02:00), attendance is keyed to the shift start date and punch-out stays on that record even after midnight.",
  },
  {
    field: "Late grace (min)",
    example: "15",
    help: "Minutes after scheduled start before a punch-in is marked LATE. 10–15 min is typical for office; 5 min for strict manufacturing.",
  },
  {
    field: "Early leave grace (min)",
    example: "15",
    help: "Punch-out this many minutes before scheduled end is still on time. Does not change half-day / full-day thresholds.",
  },
  {
    field: "In window before",
    example: "120",
    help: "How many minutes before start employees can punch in (e.g. 120 = 2 h early). Wider windows help night shifts where people arrive early.",
  },
  {
    field: "In window after",
    example: "240",
    help: "How many minutes after start punch-in is still accepted. Should cover late grace plus buffer — e.g. grace 15 + buffer ≈ 240 for a 4 h late window.",
  },
  {
    field: "Out window before",
    example: "120",
    help: "Earliest punch-out before scheduled end. Useful when teams leave slightly early with approval.",
  },
  {
    field: "Out window after",
    example: "240",
    help: "Latest punch-out after scheduled end. For overnight shifts, this often needs to be large enough to cover post-midnight checkout.",
  },
  {
    field: "Full day (min)",
    example: "480",
    help: "Worked minutes needed for a full-day present status (480 = 8 h). Usually matches scheduled span: end − start in minutes.",
  },
  {
    field: "Half day (min)",
    example: "240",
    help: "Below this worked duration, status becomes HALF_DAY. Typically half of full-day minutes.",
  },
  {
    field: "OT after (min)",
    example: "480",
    help: "Overtime minutes accrue only after this many minutes worked. Often equals full-day minutes unless you pay OT only beyond 9 h.",
  },
  {
    field: "Status",
    example: "Active",
    help: "Inactive shifts stay in the catalog but cannot be assigned on new roster rows.",
  },
] as const;

export const SHIFT_PUNCH_WINDOW_FORMULA = {
  punchIn: "In allowed: [start − in before] … [start + in after]",
  punchOut: "Out allowed: [end − out before] … [end + out after]",
} as const;
