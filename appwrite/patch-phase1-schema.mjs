import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, 'appwrite.config.json');
const cfg = JSON.parse(readFileSync(path, 'utf8'));

const str = (key, size = 128, required = false) => ({
  key,
  type: 'string',
  status: 'available',
  required,
  array: false,
  size,
  default: null,
});
const en = (key, elements, required = true) => ({
  key,
  type: 'string',
  status: 'available',
  required,
  array: false,
  elements,
  format: 'enum',
  default: null,
});
const num = (key, required = false, min = null, max = null) => ({
  key,
  type: 'integer',
  status: 'available',
  required,
  array: false,
  default: null,
  min,
  max,
});
const flt = (key, required = false) => ({
  key,
  type: 'float',
  status: 'available',
  required,
  array: false,
  default: null,
});
const bool = (key, required = false) => ({
  key,
  type: 'boolean',
  status: 'available',
  required,
  array: false,
  default: null,
});
const idx = (key, attrs, type = 'key') => ({
  key,
  type,
  status: 'available',
  attributes: attrs,
  orders: attrs.map(() => 'ASC'),
});

const emp = cfg.collections.find((c) => c.$id === 'employees');
const extra = [
  str('employeeCode', 64),
  en('employmentType', ['Permanent', '3PL', 'Intern', 'Consultant'], false),
  str('department', 128),
  str('designation', 128),
  str('reportingManagerUserId', 64),
  str('dateOfJoining', 32),
  str('grade', 64),
  str('costCenter', 64),
  str('phone', 32),
  str('dateOfBirth', 32),
  str('gender', 32),
  str('bloodGroup', 16),
  str('currentCity', 128),
  str('currentState', 128),
  str('emergencyContactName', 128),
  str('emergencyContactPhone', 32),
  str('panNumber', 16),
  str('aadhaarNumber', 20),
  str('uanNumber', 32),
  str('esiNumber', 32),
  str('pfAccountNumber', 64),
  str('bankName', 128),
  str('bankIfsc', 16),
  str('bankAccountNumber', 64),
  str('primarySiteId', 64),
  str('alternateSiteIds', 2048),
  str('workShiftStart', 16),
  str('workShiftEnd', 16),
  bool('mustChangePassword', false),
];
for (const a of extra) {
  if (!emp.attributes.some((x) => x.key === a.key)) emp.attributes.push(a);
}

const sites = {
  $id: 'sites',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'sites',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('name', 128, true),
    flt('lat', true),
    flt('long', true),
    flt('radiusMeters', true),
    str('address', 512),
    en('status', ['active', 'inactive'], true),
  ],
  indexes: [idx('companyId_idx', ['companyId']), idx('company_status_idx', ['companyId', 'status'])],
};

const attendance = {
  $id: 'attendance_records',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'attendance_records',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('userId', 64, true),
    str('dateIso', 16, true),
    str('dayOfWeek', 16),
    str('formattedDate', 64),
    str('clockInTime', 16),
    num('clockInTimestamp', false),
    str('clockOutTime', 16),
    num('clockOutTimestamp', false),
    num('totalMinutes', false),
    en('status', ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'LEAVE_PENDING'], true),
    str('siteId', 64),
    en('geofenceStatus', ['INSIDE', 'OUTSIDE', 'UNKNOWN'], false),
    flt('distanceMeters'),
    flt('punchInLat'),
    flt('punchInLong'),
    flt('punchInAccuracy'),
    flt('punchOutLat'),
    flt('punchOutLong'),
    flt('punchOutAccuracy'),
    str('deviceId', 128),
    str('note', 512),
    str('locationName', 256),
    str('leaveRequestId', 64),
  ],
  indexes: [
    idx('company_date_idx', ['companyId', 'dateIso']),
    idx('company_employee_idx', ['companyId', 'employeeId']),
    idx('user_date_idx', ['userId', 'dateIso']),
  ],
};

const regs = {
  $id: 'attendance_regularizations',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'attendance_regularizations',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('userId', 64, true),
    str('dateIso', 16, true),
    str('reason', 1024, true),
    str('requestedClockIn', 16),
    str('requestedClockOut', 16),
    en('status', ['pending', 'approved', 'rejected'], true),
    str('approverUserId', 64),
    str('reviewNote', 512),
  ],
  indexes: [
    idx('company_status_idx', ['companyId', 'status']),
    idx('company_employee_idx', ['companyId', 'employeeId']),
  ],
};

const leaveTypes = {
  $id: 'leave_types',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'leave_types',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('name', 128, true),
    str('code', 32, true),
    bool('paid', true),
    flt('accrualPerMonth', true),
    flt('maxBalance', true),
    bool('carryForward', true),
    en('status', ['active', 'inactive'], true),
  ],
  indexes: [idx('companyId_idx', ['companyId'])],
};

const leaveBalances = {
  $id: 'leave_balances',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'leave_balances',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('leaveTypeId', 64, true),
    num('year', true),
    flt('balance', true),
  ],
  indexes: [
    idx('company_employee_idx', ['companyId', 'employeeId']),
    idx('emp_type_year_unique', ['employeeId', 'leaveTypeId', 'year'], 'unique'),
  ],
};

const leaveRequests = {
  $id: 'leave_requests',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'leave_requests',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('userId', 64, true),
    str('leaveTypeId', 64, true),
    str('fromDate', 16, true),
    str('toDate', 16, true),
    flt('days', true),
    en('status', ['pending', 'approved', 'rejected', 'cancelled'], true),
    str('approverUserId', 64),
    str('note', 1024),
  ],
  indexes: [
    idx('company_status_idx', ['companyId', 'status']),
    idx('company_employee_idx', ['companyId', 'employeeId']),
  ],
};

const holidays = {
  $id: 'holidays',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'holidays',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('date', 16, true),
    str('name', 128, true),
    str('region', 128),
  ],
  indexes: [idx('company_date_idx', ['companyId', 'date'])],
};

const salaryStructures = {
  $id: 'salary_structures',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'salary_structures',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('employeeId', 64, true),
    str('effectiveFrom', 16, true),
    str('components', 8192, true),
    flt('ctcMonthly', true),
    en('status', ['active', 'inactive'], true),
  ],
  indexes: [idx('company_employee_idx', ['companyId', 'employeeId'])],
};

const payrollRuns = {
  $id: 'payroll_runs',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'payroll_runs',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('month', 7, true),
    en('status', ['draft', 'finalized'], true),
    str('totals', 4096, true),
    str('notes', 2048),
  ],
  indexes: [idx('company_month_unique', ['companyId', 'month'], 'unique')],
};

const payslips = {
  $id: 'payslips',
  $permissions: [],
  databaseId: 'hr_portal',
  name: 'payslips',
  enabled: true,
  documentSecurity: true,
  attributes: [
    str('companyId', 64, true),
    str('payrollRunId', 64, true),
    str('employeeId', 64, true),
    str('breakdown', 8192, true),
    str('fileId', 64),
    flt('netPay', true),
    str('month', 7, true),
  ],
  indexes: [idx('run_idx', ['payrollRunId']), idx('company_employee_idx', ['companyId', 'employeeId'])],
};

const byId = new Map(cfg.collections.map((c) => [c.$id, c]));
byId.set('employees', emp);
for (const c of [
  sites,
  attendance,
  regs,
  leaveTypes,
  leaveBalances,
  leaveRequests,
  holidays,
  salaryStructures,
  payrollRuns,
  payslips,
]) {
  byId.set(c.$id, c);
}
cfg.collections = [...byId.values()];
writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('collections:', cfg.collections.map((c) => c.$id).join(', '));
console.log('employee attrs:', emp.attributes.length);
