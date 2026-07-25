import type { AttendanceStatus, EmployeeMembership } from '@/lib/appwrite/types';

export const REGISTER_PAGE_SIZE = 50;
export const REGISTER_EXPORT_MAX = 2000;

export type RegisterCellCode = 'P' | 'LT' | 'E' | 'AB' | 'L' | 'OFF' | 'HD' | '';

export type RegisterDayFact = {
  status?: AttendanceStatus;
  earlyDeparture?: boolean;
};

export type RegisterEmployeeRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch: string;
  designation: string;
  employmentType: string;
  days: RegisterCellCode[];
  summary: {
    P: number;
    LT: number;
    E: number;
    AB: number;
    L: number;
    OFF: number;
    HD: number;
  };
};

export type AttendanceRegisterResult = {
  month: string;
  daysInMonth: number;
  monthDays: string[];
  rows: RegisterEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: string[];
  designations: string[];
  branches: { id: string; name: string }[];
};

export type AttendanceRegisterFilters = {
  month: string;
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  branch?: string;
  designation?: string;
  sort?: 'code' | 'name';
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const STATUS_PRIORITY: Record<RegisterCellCode, number> = {
  L: 70,
  HD: 60,
  LT: 50,
  E: 40,
  P: 30,
  AB: 20,
  OFF: 10,
  '': 0,
};

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function currentRegisterMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthDays(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year!, monthNum!, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${month}-${String(day).padStart(2, '0')}`;
  });
  return { daysInMonth, monthDays };
}

export function isWeeklyOff(dateIso: string, workWeek: string[]) {
  const date = new Date(`${dateIso}T12:00:00`);
  const key = DAY_KEYS[date.getDay()];
  return !workWeek.includes(key);
}

export function mapAttendanceFactToRegisterCode(fact: RegisterDayFact): RegisterCellCode {
  const status = fact.status;
  if (!status) return '';
  if (status === 'ON_LEAVE' || status === 'LEAVE_PENDING') return 'L';
  if (status === 'HALF_DAY') return 'HD';
  if (status === 'ABSENT') return 'AB';
  if (status === 'LATE') return 'LT';
  if (fact.earlyDeparture) return 'E';
  if (status === 'PRESENT') return 'P';
  return '';
}

/** Merge multiple attendance rows for the same calendar/shift day. */
export function mergeRegisterFacts(facts: RegisterDayFact[]): RegisterDayFact | undefined {
  if (facts.length === 0) return undefined;
  let best = mapAttendanceFactToRegisterCode(facts[0]!);
  let bestFact = facts[0]!;
  for (const fact of facts.slice(1)) {
    const code = mapAttendanceFactToRegisterCode(fact);
    if (STATUS_PRIORITY[code] > STATUS_PRIORITY[best]) {
      best = code;
      bestFact = fact;
    }
  }
  return bestFact;
}

export function resolveRegisterCell(
  dateIso: string,
  today: string,
  workWeek: string[],
  holidayDates: Set<string>,
  fact?: RegisterDayFact,
): RegisterCellCode {
  if (dateIso > today) return '';
  if (holidayDates.has(dateIso)) return 'OFF';
  if (isWeeklyOff(dateIso, workWeek)) return 'OFF';
  if (fact?.status) return mapAttendanceFactToRegisterCode(fact);
  return 'AB';
}

function summarizeDays(days: RegisterCellCode[]) {
  return days.reduce(
    (acc, code) => {
      if (code === 'P') acc.P += 1;
      if (code === 'LT') acc.LT += 1;
      if (code === 'E') acc.E += 1;
      if (code === 'AB') acc.AB += 1;
      if (code === 'L') acc.L += 1;
      if (code === 'OFF') acc.OFF += 1;
      if (code === 'HD') acc.HD += 1;
      return acc;
    },
    { P: 0, LT: 0, E: 0, AB: 0, L: 0, OFF: 0, HD: 0 },
  );
}

export function filterRegisterEmployees(
  employees: EmployeeMembership[],
  filters: Pick<
    AttendanceRegisterFilters,
    'search' | 'department' | 'branch' | 'designation'
  >,
  siteNameById: Map<string, string>,
) {
  const search = filters.search?.trim().toLowerCase() || '';
  const department = filters.department?.trim() || '';
  const branch = filters.branch?.trim() || '';
  const designation = filters.designation?.trim() || '';

  return employees.filter((employee) => {
    if (employee.status !== 'active') return false;
    if (department && employee.department !== department) return false;
    if (designation && employee.designation !== designation) return false;
    if (branch && employee.primarySiteId !== branch) return false;
    if (!search) return true;
    const branchName = siteNameById.get(employee.primarySiteId) || '';
    const haystack = [
      employee.employeeCode,
      employee.name,
      employee.department,
      employee.designation,
      branchName,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function sortRegisterEmployees(
  employees: EmployeeMembership[],
  sort: 'code' | 'name' = 'code',
) {
  const sorted = [...employees];
  sorted.sort((left, right) => {
    if (sort === 'name') {
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    }
    return left.employeeCode.localeCompare(right.employeeCode, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
  return sorted;
}

export function buildRegisterRows(
  employees: EmployeeMembership[],
  month: string,
  workWeek: string[],
  holidayDates: Set<string>,
  attendanceByEmployeeDate: Map<string, RegisterDayFact[]>,
  siteNameById: Map<string, string>,
  today = todayIsoDate(),
): RegisterEmployeeRow[] {
  const { monthDays } = getMonthDays(month);

  return employees.map((employee) => {
    const days = monthDays.map((dateIso) => {
      const facts = attendanceByEmployeeDate.get(`${employee.id}:${dateIso}`);
      return resolveRegisterCell(
        dateIso,
        today,
        workWeek,
        holidayDates,
        facts ? mergeRegisterFacts(facts) : undefined,
      );
    });

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.name,
      department: employee.department,
      branch: siteNameById.get(employee.primarySiteId) || '',
      designation: employee.designation,
      employmentType: employee.employmentType || '',
      days,
      summary: summarizeDays(days),
    };
  });
}

export function registerRowsToCsv(
  rows: RegisterEmployeeRow[],
  month: string,
  daysInMonth: number,
) {
  const dayHeaders = Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
  const headers = [
    'Employee Code',
    'Employee Name',
    'Department',
    'Designation',
    'Employment Type',
    'Branch',
    ...dayHeaders,
    'Present (P)',
    'Late (LT)',
    'Early (E)',
    'Half Day (HD)',
    'Absent (AB)',
    'Leave (L)',
    'Off (OFF)',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.employeeCode,
        row.employeeName,
        row.department,
        row.designation,
        row.employmentType,
        row.branch,
        ...row.days.map((code) => code || '-'),
        row.summary.P,
        row.summary.LT,
        row.summary.E,
        row.summary.HD,
        row.summary.AB,
        row.summary.L,
        row.summary.OFF,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function registerExportFilename(month: string) {
  return `attendance-register-${month}.csv`;
}
