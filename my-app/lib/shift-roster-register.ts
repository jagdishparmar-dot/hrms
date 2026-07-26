import type { EmployeeMembership, EmployeeShiftAssignment, WorkShift } from '@/lib/appwrite/types';

import {
  currentRegisterMonth,
  filterRegisterEmployees,
  getMonthDays,
  sortRegisterEmployees,
} from '@/lib/attendance-register';

export {
  currentRegisterMonth,
  filterRegisterEmployees,
  getMonthDays,
  sortRegisterEmployees,
};

export const SHIFT_ROSTER_REGISTER_PAGE_SIZE = 50;
export const SHIFT_ROSTER_REGISTER_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const SHIFT_ROSTER_REGISTER_EXPORT_MAX = 2000;

export type ShiftRosterEmployeeRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  days: string[];
  summary: {
    scheduledDays: number;
    shiftSlots: number;
  };
};

export type ShiftRosterRegisterResult = {
  month: string;
  daysInMonth: number;
  monthDays: string[];
  rows: ShiftRosterEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: string[];
  designations: string[];
  branches: { id: string; name: string }[];
  shiftCodes: string[];
};

export type ShiftRosterRegisterFilters = {
  month: string;
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  branch?: string;
  designation?: string;
  sort?: 'code' | 'name';
};

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildShiftAssignmentLabelMap(
  assignments: EmployeeShiftAssignment[],
  shiftCodeById: Map<string, string>,
) {
  const grouped = new Map<string, Array<{ sequence: number; code: string }>>();

  for (const row of assignments) {
    if (row.status === 'cancelled') continue;
    const code = (shiftCodeById.get(row.shiftId) || row.shiftCode || '').trim();
    if (!code) continue;
    const key = `${row.employeeId}:${row.dateIso}`;
    const list = grouped.get(key) || [];
    list.push({ sequence: row.sequence, code });
    grouped.set(key, list);
  }

  const labels = new Map<string, string>();
  for (const [key, items] of grouped) {
    items.sort((left, right) => left.sequence - right.sequence);
    labels.set(key, items.map((item) => item.code).join('+'));
  }

  return labels;
}

export function buildShiftRosterRows(
  employees: EmployeeMembership[],
  month: string,
  assignmentLabels: Map<string, string>,
): ShiftRosterEmployeeRow[] {
  const { monthDays } = getMonthDays(month);

  return employees.map((employee) => {
    const days = monthDays.map((dateIso) => {
      return assignmentLabels.get(`${employee.id}:${dateIso}`) || '';
    });

    const shiftSlots = days.reduce(
      (count, label) => count + (label ? label.split('+').length : 0),
      0,
    );
    const scheduledDays = days.filter(Boolean).length;

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.name,
      designation: employee.designation,
      days,
      summary: {
        scheduledDays,
        shiftSlots,
      },
    };
  });
}

export function shiftRosterRowsToCsv(
  rows: ShiftRosterEmployeeRow[],
  month: string,
  daysInMonth: number,
) {
  const dayHeaders = Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
  const headers = [
    'Employee Code',
    'Employee Name',
    'Designation',
    ...dayHeaders,
    'Scheduled Days',
    'Shift Slots',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.employeeCode,
        row.employeeName,
        row.designation,
        ...row.days.map((code) => code || '-'),
        row.summary.scheduledDays,
        row.summary.shiftSlots,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function shiftRosterExportFilename(month: string) {
  return `shift-roster-${month}.csv`;
}

export function shiftTypeCellClass(shiftType?: WorkShift['shiftType']) {
  switch (shiftType) {
    case 'evening':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200';
    case 'night':
      return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200';
    case 'cross_midnight':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200';
    case 'rotational':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200';
    default:
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200';
  }
}
