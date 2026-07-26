import { z } from 'zod';

export const SHIFT_ROSTER_CSV_HEADERS = [
  'employee_code',
  'shift_code',
  'date',
  'sequence',
  'note',
] as const;

export const SHIFT_ROSTER_IMPORT_MAX_ROWS = 2000;
export const SHIFT_ROSTER_IMPORT_MAX_BYTES = 512 * 1024;

export const shiftRosterCsvRowSchema = z.object({
  employeeCode: z.string().trim().min(1, 'Employee code is required.'),
  shiftCode: z.string().trim().min(1, 'Shift code is required.'),
  dateIso: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  sequence: z.coerce.number().int().min(1).max(10).default(1),
  note: z.string().trim().max(256).optional().or(z.literal('')),
});

export type ShiftRosterCsvRow = z.infer<typeof shiftRosterCsvRowSchema>;

const HEADER_ALIASES: Record<string, keyof ShiftRosterCsvRow | 'skip'> = {
  employee_code: 'employeeCode',
  employeecode: 'employeeCode',
  employee: 'employeeCode',
  code: 'employeeCode',
  shift_code: 'shiftCode',
  shiftcode: 'shiftCode',
  shift: 'shiftCode',
  date: 'dateIso',
  date_iso: 'dateIso',
  dateiso: 'dateIso',
  sequence: 'sequence',
  seq: 'sequence',
  note: 'note',
  notes: 'note',
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseShiftRosterCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return { ok: false as const, error: 'CSV file is empty.' };
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false as const,
      error: 'CSV must include a header row and at least one data row.',
    };
  }

  const headerCells = parseCsvLine(lines[0]!);
  const columnMap = new Map<number, keyof ShiftRosterCsvRow>();

  for (let index = 0; index < headerCells.length; index += 1) {
    const mapped = HEADER_ALIASES[normalizeHeader(headerCells[index] || '')];
    if (mapped && mapped !== 'skip') {
      columnMap.set(index, mapped);
    }
  }

  const required = ['employeeCode', 'shiftCode', 'dateIso'] as const;
  for (const field of required) {
    if (![...columnMap.values()].includes(field)) {
      return {
        ok: false as const,
        error: `Missing required column: ${field === 'dateIso' ? 'date' : field.replace(/([A-Z])/g, '_$1').toLowerCase()}.`,
      };
    }
  }

  const rows: Array<{ lineNumber: number; raw: Record<string, string> }> = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]!);
    const raw: Record<string, string> = {};
    for (const [columnIndex, field] of columnMap.entries()) {
      raw[field] = cells[columnIndex] ?? '';
    }
    rows.push({ lineNumber: lineIndex + 1, raw });
  }

  if (rows.length > SHIFT_ROSTER_IMPORT_MAX_ROWS) {
    return {
      ok: false as const,
      error: `CSV exceeds the ${SHIFT_ROSTER_IMPORT_MAX_ROWS}-row import limit.`,
    };
  }

  return { ok: true as const, rows };
}

export function shiftRosterCsvTemplate(params?: {
  employeeCode?: string;
  shiftCodes?: string[];
}) {
  const employeeCode = params?.employeeCode || 'EMP0001';
  const dayShift = params?.shiftCodes?.[0] || 'DAY';
  const nightShift = params?.shiftCodes?.[1] || params?.shiftCodes?.[0] || 'NIGHT';
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    SHIFT_ROSTER_CSV_HEADERS.join(','),
    [employeeCode, dayShift, today, '1', ''].map(csvEscape).join(','),
    [employeeCode, nightShift, today, '2', 'Second shift'].map(csvEscape).join(','),
    [employeeCode, 'OFF', today, '1', 'Use OFF to clear a scheduled shift'].map(csvEscape).join(','),
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function assignmentLookupKey(
  employeeId: string,
  dateIso: string,
  sequence: number,
) {
  return `${employeeId}|${dateIso}|${sequence}`;
}
