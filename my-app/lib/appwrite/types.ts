export const TENANT_ROLES = [
  'company_admin',
  'hr_manager',
  'payroll_admin',
  'reporting_manager',
  'employee',
  'vendor_admin',
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export type CompanyStatus = 'active' | 'suspended' | 'pending' | 'archived';
export type EmployeeStatus = 'active' | 'inactive' | 'invited';
export type EmploymentType = 'Permanent' | '3PL' | 'Intern' | 'Consultant';
export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'LEAVE_PENDING';
export type GeofenceStatus = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN';
export type RegularizationStatus = 'pending' | 'approved' | 'rejected';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayrollRunStatus = 'draft' | 'finalized';

export interface CompanyBranding {
  logoUrl: string;
  primaryColor: string;
  emailSenderName: string;
}

export interface CompanyModules {
  attendance: boolean;
  leave: boolean;
  payroll: boolean;
  shifts: boolean;
  documents: boolean;
}

export interface CompanySettings {
  workWeek: string[];
  timezone: string;
  currency: string;
  jurisdictions: string[];
  departments: string[];
  designations: string[];
  lateGraceMinutes?: number;
  payCycleDay?: number;
  /** Legal / business identity (platform + tenant editable) */
  legalName?: string;
  gstin?: string;
  registeredAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  dataRetentionDays?: number;
  modules?: CompanyModules;
  /** Employee code auto-generation (tenant settings → Organization) */
  employeeCodePrefix?: string;
  employeeCodePadding?: number;
  employeeCodeNextSequence?: number;
  employeeCodeAutoGenerate?: boolean;
}

export interface CompanyFeatureFlags {
  geofencing: boolean;
  payroll3pl: boolean;
  selfiePunch: boolean;
  sso: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  teamId: string;
  plan: string;
  featureFlags: CompanyFeatureFlags;
  branding: CompanyBranding;
  settings: CompanySettings;
  status: CompanyStatus;
  maxEmployees: number;
  createdByUserId: string | null;
  $createdAt?: string;
  $updatedAt?: string;
}

/** Platform console list row (company + usage metrics). */
export type PlatformCompanyRow = Company & {
  userCount: number;
  activeUserCount: number;
};

export interface EmployeeMembership {
  id: string;
  companyId: string;
  userId: string;
  teamId: string;
  email: string;
  name: string;
  role: TenantRole;
  status: EmployeeStatus;
  employeeCode: string;
  employmentType: EmploymentType | '';
  vendorId: string;
  department: string;
  designation: string;
  reportingManagerUserId: string;
  dateOfJoining: string;
  grade: string;
  costCenter: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  currentCity: string;
  currentState: string;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentPincode: string;
  profilePictureFileId: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esiNumber: string;
  pfAccountNumber: string;
  bankName: string;
  bankIfsc: string;
  bankAccountNumber: string;
  primarySiteId: string;
  alternateSiteIds: string[];
  workShiftStart: string;
  workShiftEnd: string;
  /** Optional FK to `shifts` collection; empty falls back to workShiftStart/End. */
  shiftId: string;
  mustChangePassword: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

export type EmployeeDocumentCategory =
  | 'profile_picture'
  | 'identity'
  | 'compliance'
  | 'employment';

export type EmployeeDocumentStatus = 'active' | 'archived';

export interface EmployeeDocument {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  category: EmployeeDocumentCategory;
  title: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  status: EmployeeDocumentStatus;
  previewUrl?: string;
  $createdAt?: string;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  lat: number;
  long: number;
  radiusMeters: number;
  address: string;
  status: 'active' | 'inactive';
}

export interface WorkShift {
  id: string;
  companyId: string;
  name: string;
  code: string;
  shiftType:
    | 'general'
    | 'evening'
    | 'night'
    | 'rotational'
    | 'cross_midnight';
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  punchInBeforeMinutes: number;
  punchInAfterMinutes: number;
  punchOutBeforeMinutes: number;
  punchOutAfterMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  overtimeAfterMinutes: number;
  status: 'active' | 'inactive';
}

/** Date-scoped roster entry (supports multi-shift / rotational days). */
export interface EmployeeShiftAssignment {
  id: string;
  companyId: string;
  employeeId: string;
  dateIso: string;
  shiftId: string;
  sequence: number;
  siteId: string;
  status: 'scheduled' | 'cancelled';
  note: string;
  shiftName?: string;
  shiftCode?: string;
  employeeName?: string;
}

/** One in/out pair within a shift attendance record. */
export interface AttendancePunchSegment {
  id: string;
  companyId: string;
  attendanceId: string;
  employeeId: string;
  dateIso: string;
  segmentIndex: number;
  clockInTime: string | null;
  clockInTimestamp: number | null;
  clockOutTime: string | null;
  clockOutTimestamp: number | null;
  siteId: string;
  deviceId: string;
  isOpen: boolean;
  punchInLat: number | null;
  punchInLong: number | null;
  punchOutLat: number | null;
  punchOutLong: number | null;
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  /** Business / shift date (date of shift start). Not necessarily punch calendar day. */
  dateIso: string;
  dayOfWeek: string;
  formattedDate: string;
  shiftId: string;
  assignmentSequence: number;
  segmentCount: number;
  isOvernight: boolean;
  scheduledStartTimestamp: number | null;
  scheduledEndTimestamp: number | null;
  clockInTime: string | null;
  clockInTimestamp: number | null;
  clockOutTime: string | null;
  clockOutTimestamp: number | null;
  totalMinutes: number;
  earlyDeparture: boolean;
  overtimeMinutes: number;
  status: AttendanceStatus;
  siteId: string;
  geofenceStatus: GeofenceStatus;
  distanceMeters: number;
  punchInLat: number | null;
  punchInLong: number | null;
  punchInAccuracy: number | null;
  punchOutLat: number | null;
  punchOutLong: number | null;
  punchOutAccuracy: number | null;
  deviceId: string;
  note: string;
  locationName: string;
  leaveRequestId?: string;
  employeeName?: string;
  employeeCode?: string;
}

export interface AttendanceRegularization {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  dateIso: string;
  reason: string;
  requestedClockIn: string;
  requestedClockOut: string;
  /** Calendar date for punch-out when it differs from shift date (overnight). */
  requestedOutDateIso: string;
  status: RegularizationStatus;
  approverUserId: string;
  reviewNote: string;
  employeeName?: string;
}

export interface LeaveType {
  id: string;
  companyId: string;
  name: string;
  code: string;
  paid: boolean;
  accrualPerMonth: number;
  maxBalance: number;
  carryForward: boolean;
  status: 'active' | 'inactive';
}

export interface ThreePlVendor {
  id: string;
  companyId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  $createdAt?: string;
  $updatedAt?: string;
}

export interface LeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  balance: number;
}

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: LeaveRequestStatus;
  approverUserId: string;
  note: string;
  employeeName?: string;
  leaveTypeName?: string;
}

export interface Holiday {
  id: string;
  companyId: string;
  date: string;
  name: string;
  region: string;
}

export interface SalaryComponent {
  key: string;
  label: string;
  amount: number;
  type: 'earning' | 'deduction';
}

export interface SalaryStructure {
  id: string;
  companyId: string;
  employeeId: string;
  effectiveFrom: string;
  components: SalaryComponent[];
  ctcMonthly: number;
  status: 'active' | 'inactive';
}

export interface PayrollRun {
  id: string;
  companyId: string;
  month: string;
  status: PayrollRunStatus;
  totals: Record<string, number>;
  notes: string;
}

export interface Payslip {
  id: string;
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  breakdown: Record<string, unknown>;
  fileId: string;
  netPay: number;
  month: string;
}

export interface AuditLog {
  id: string;
  companyId: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  $createdAt?: string;
}

export const DEFAULT_BRANDING: CompanyBranding = {
  logoUrl: '',
  primaryColor: '#1A3A6B',
  emailSenderName: 'HR Portal',
};

export const DEFAULT_MODULES: CompanyModules = {
  attendance: true,
  leave: true,
  payroll: true,
  shifts: true,
  documents: true,
};

export const DEFAULT_SETTINGS: CompanySettings = {
  workWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  jurisdictions: ['IN'],
  departments: [],
  designations: [],
  lateGraceMinutes: 15,
  payCycleDay: 1,
  legalName: '',
  gstin: '',
  registeredAddress: '',
  contactEmail: '',
  contactPhone: '',
  dataRetentionDays: 365,
  modules: DEFAULT_MODULES,
  employeeCodePrefix: 'EMP',
  employeeCodePadding: 4,
  employeeCodeNextSequence: 1,
  employeeCodeAutoGenerate: true,
};

export const DEFAULT_FEATURE_FLAGS: CompanyFeatureFlags = {
  geofencing: true,
  payroll3pl: false,
  selfiePunch: false,
  sso: false,
};

export function isCompanyAdminRole(role: TenantRole) {
  return role === 'company_admin';
}

export function maskAadhaar(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value ? '****' : '';
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function maskBankAccount(value: string) {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}
