import type {
  AttendanceRecord,
  AttendanceRegularization,
  ShiftChangeRequest,
  AttendanceStatus,
  AuditLog,
  Company,
  CompanyBranding,
  CompanyFeatureFlags,
  CompanySettings,
  CompanyStatus,
  EmployeeMembership,
  EmployeeDocument,
  EmployeeDocumentCategory,
  EmployeeDocumentStatus,
  EmployeeStatus,
  EmploymentType,
  GeofenceStatus,
  AttendancePolicy,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
  PayrollRun,
  PayrollRunStatus,
  Payslip,
  RegularizationStatus,
  SalaryComponent,
  SalaryStructure,
  Site,
  TenantRole,
  ThreePlVendor,
  WorkShift,
  EmployeeShiftAssignment,
  AttendancePunchSegment,
} from '@/lib/appwrite/types';
import {
  DEFAULT_BRANDING,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MODULES,
  DEFAULT_SETTINGS,
} from '@/lib/appwrite/types';

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function parseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapCompany(doc: Record<string, unknown>): Company {
  return {
    id: String(doc.$id),
    name: String(doc.name || ''),
    slug: String(doc.slug || ''),
    teamId: String(doc.teamId || ''),
    plan: String(doc.plan || 'free'),
    featureFlags: parseJson<CompanyFeatureFlags>(doc.featureFlags, DEFAULT_FEATURE_FLAGS),
    branding: parseJson<CompanyBranding>(doc.branding, DEFAULT_BRANDING),
    settings: (() => {
      const settings = parseJson<CompanySettings>(doc.settings, DEFAULT_SETTINGS);
      return {
        ...settings,
        modules: { ...DEFAULT_MODULES, ...(settings.modules || {}) },
      };
    })(),
    status: (doc.status as CompanyStatus) || 'active',
    maxEmployees: Number(doc.maxEmployees || 50),
    createdByUserId: doc.createdByUserId ? String(doc.createdByUserId) : null,
    $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
    $updatedAt: doc.$updatedAt ? String(doc.$updatedAt) : undefined,
  };
}

export function mapEmployee(doc: Record<string, unknown>): EmployeeMembership {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    userId: String(doc.userId || ''),
    teamId: String(doc.teamId || ''),
    email: String(doc.email || ''),
    name: String(doc.name || ''),
    role: (doc.role as TenantRole) || 'employee',
    status: (doc.status as EmployeeStatus) || 'active',
    employeeCode: String(doc.employeeCode || ''),
    employmentType: (doc.employmentType as EmploymentType) || '',
    vendorId: String(doc.vendorId || ''),
    department: String(doc.department || ''),
    designation: String(doc.designation || ''),
    reportingManagerUserId: String(doc.reportingManagerUserId || ''),
    dateOfJoining: String(doc.dateOfJoining || ''),
    grade: String(doc.grade || ''),
    costCenter: String(doc.costCenter || ''),
    phone: String(doc.phone || ''),
    dateOfBirth: String(doc.dateOfBirth || ''),
    gender: String(doc.gender || ''),
    bloodGroup: String(doc.bloodGroup || ''),
    currentCity: String(doc.currentCity || ''),
    currentState: String(doc.currentState || ''),
    currentAddressLine1: String(doc.currentAddressLine1 || ''),
    currentAddressLine2: String(doc.currentAddressLine2 || ''),
    currentPincode: String(doc.currentPincode || ''),
    profilePictureFileId: String(doc.profilePictureFileId || ''),
    emergencyContactName: String(doc.emergencyContactName || ''),
    emergencyContactPhone: String(doc.emergencyContactPhone || ''),
    panNumber: String(doc.panNumber || ''),
    aadhaarNumber: String(doc.aadhaarNumber || ''),
    uanNumber: String(doc.uanNumber || ''),
    esiNumber: String(doc.esiNumber || ''),
    pfAccountNumber: String(doc.pfAccountNumber || ''),
    bankName: String(doc.bankName || ''),
    bankIfsc: String(doc.bankIfsc || ''),
    bankAccountNumber: String(doc.bankAccountNumber || ''),
    primarySiteId: String(doc.primarySiteId || ''),
    alternateSiteIds: parseArray(doc.alternateSiteIds),
    attendancePolicy: (doc.attendancePolicy as AttendancePolicy) || 'geofenced',
    workShiftStart: String(doc.workShiftStart || '09:00'),
    workShiftEnd: String(doc.workShiftEnd || '18:00'),
    shiftId: String(doc.shiftId || ''),
    mustChangePassword: Boolean(doc.mustChangePassword),
    $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
    $updatedAt: doc.$updatedAt ? String(doc.$updatedAt) : undefined,
  };
}

export function mapEmployeeDocument(doc: Record<string, unknown>): EmployeeDocument {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    userId: String(doc.userId || ''),
    category: (doc.category as EmployeeDocumentCategory) || 'employment',
    title: String(doc.title || ''),
    fileId: String(doc.fileId || ''),
    fileName: String(doc.fileName || ''),
    mimeType: String(doc.mimeType || ''),
    fileSize: Number(doc.fileSize || 0),
    uploadedByUserId: String(doc.uploadedByUserId || ''),
    status: (doc.status as EmployeeDocumentStatus) || 'active',
    $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
  };
}

export function mapSite(doc: Record<string, unknown>): Site {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    name: String(doc.name || ''),
    lat: Number(doc.lat || 0),
    long: Number(doc.long || 0),
    radiusMeters: Number(doc.radiusMeters || 500),
    address: String(doc.address || ''),
    status: (doc.status as 'active' | 'inactive') || 'active',
  };
}

export function mapWorkShift(doc: Record<string, unknown>): WorkShift {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    name: String(doc.name || ''),
    code: String(doc.code || ''),
    shiftType:
      (doc.shiftType as WorkShift['shiftType']) ||
      (Boolean(doc.crossesMidnight) ? 'cross_midnight' : 'general'),
    startTime: String(doc.startTime || '09:00'),
    endTime: String(doc.endTime || '18:00'),
    crossesMidnight: Boolean(doc.crossesMidnight),
    punchInBeforeMinutes: Number(doc.punchInBeforeMinutes ?? 120),
    punchInAfterMinutes: Number(doc.punchInAfterMinutes ?? 240),
    punchOutBeforeMinutes: Number(doc.punchOutBeforeMinutes ?? 120),
    punchOutAfterMinutes: Number(doc.punchOutAfterMinutes ?? 240),
    lateGraceMinutes: Number(doc.lateGraceMinutes ?? 15),
    earlyLeaveGraceMinutes: Number(doc.earlyLeaveGraceMinutes ?? 15),
    fullDayMinutes: Number(doc.fullDayMinutes ?? 480),
    halfDayMinutes: Number(doc.halfDayMinutes ?? 240),
    overtimeAfterMinutes: Number(doc.overtimeAfterMinutes ?? 480),
    status: (doc.status as 'active' | 'inactive') || 'active',
  };
}

export function mapAttendance(doc: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    userId: String(doc.userId || ''),
    dateIso: String(doc.dateIso || ''),
    dayOfWeek: String(doc.dayOfWeek || ''),
    formattedDate: String(doc.formattedDate || ''),
    shiftId: String(doc.shiftId || ''),
    assignmentSequence: Number(doc.assignmentSequence || 1),
    segmentCount: Number(doc.segmentCount || 0),
    isOvernight: Boolean(doc.isOvernight),
    scheduledStartTimestamp:
      doc.scheduledStartTimestamp != null ? Number(doc.scheduledStartTimestamp) : null,
    scheduledEndTimestamp:
      doc.scheduledEndTimestamp != null ? Number(doc.scheduledEndTimestamp) : null,
    clockInTime: doc.clockInTime ? String(doc.clockInTime) : null,
    clockInTimestamp: doc.clockInTimestamp != null ? Number(doc.clockInTimestamp) : null,
    clockOutTime: doc.clockOutTime ? String(doc.clockOutTime) : null,
    clockOutTimestamp: doc.clockOutTimestamp != null ? Number(doc.clockOutTimestamp) : null,
    totalMinutes: Number(doc.totalMinutes || 0),
    earlyDeparture: Boolean(doc.earlyDeparture),
    overtimeMinutes: Number(doc.overtimeMinutes || 0),
    status: (doc.status as AttendanceStatus) || 'PRESENT',
    siteId: String(doc.siteId || ''),
    geofenceStatus: (doc.geofenceStatus as GeofenceStatus) || 'UNKNOWN',
    distanceMeters: Number(doc.distanceMeters || 0),
    punchInLat: doc.punchInLat != null ? Number(doc.punchInLat) : null,
    punchInLong: doc.punchInLong != null ? Number(doc.punchInLong) : null,
    punchInAccuracy: doc.punchInAccuracy != null ? Number(doc.punchInAccuracy) : null,
    punchOutLat: doc.punchOutLat != null ? Number(doc.punchOutLat) : null,
    punchOutLong: doc.punchOutLong != null ? Number(doc.punchOutLong) : null,
    punchOutAccuracy: doc.punchOutAccuracy != null ? Number(doc.punchOutAccuracy) : null,
    deviceId: String(doc.deviceId || ''),
    note: String(doc.note || ''),
    locationName: String(doc.locationName || ''),
    leaveRequestId: String(doc.leaveRequestId || ''),
  };
}

export function mapShiftAssignment(doc: Record<string, unknown>): EmployeeShiftAssignment {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    dateIso: String(doc.dateIso || ''),
    shiftId: String(doc.shiftId || ''),
    sequence: Number(doc.sequence || 1),
    siteId: String(doc.siteId || ''),
    status: (doc.status as 'scheduled' | 'cancelled') || 'scheduled',
    note: String(doc.note || ''),
  };
}

export function mapPunchSegment(doc: Record<string, unknown>): AttendancePunchSegment {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    attendanceId: String(doc.attendanceId || ''),
    employeeId: String(doc.employeeId || ''),
    dateIso: String(doc.dateIso || ''),
    segmentIndex: Number(doc.segmentIndex || 0),
    clockInTime: doc.clockInTime ? String(doc.clockInTime) : null,
    clockInTimestamp: doc.clockInTimestamp != null ? Number(doc.clockInTimestamp) : null,
    clockOutTime: doc.clockOutTime ? String(doc.clockOutTime) : null,
    clockOutTimestamp: doc.clockOutTimestamp != null ? Number(doc.clockOutTimestamp) : null,
    siteId: String(doc.siteId || ''),
    deviceId: String(doc.deviceId || ''),
    isOpen: Boolean(doc.isOpen),
    punchInLat: doc.punchInLat != null ? Number(doc.punchInLat) : null,
    punchInLong: doc.punchInLong != null ? Number(doc.punchInLong) : null,
    punchOutLat: doc.punchOutLat != null ? Number(doc.punchOutLat) : null,
    punchOutLong: doc.punchOutLong != null ? Number(doc.punchOutLong) : null,
  };
}

export function mapRegularization(doc: Record<string, unknown>): AttendanceRegularization {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    userId: String(doc.userId || ''),
    dateIso: String(doc.dateIso || ''),
    reason: String(doc.reason || ''),
    requestedClockIn: String(doc.requestedClockIn || ''),
    requestedClockOut: String(doc.requestedClockOut || ''),
    requestedOutDateIso: String(doc.requestedOutDateIso || ''),
    status: (doc.status as RegularizationStatus) || 'pending',
    approverUserId: String(doc.approverUserId || ''),
    reviewNote: String(doc.reviewNote || ''),
  };
}

export function mapShiftChangeRequest(doc: Record<string, unknown>): ShiftChangeRequest {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    userId: String(doc.userId || ''),
    dateIso: String(doc.dateIso || ''),
    sequence: Number(doc.sequence || 1),
    currentShiftId: String(doc.currentShiftId || ''),
    currentAssignmentId: String(doc.currentAssignmentId || ''),
    requestedShiftId: String(doc.requestedShiftId || ''),
    reason: String(doc.reason || ''),
    status: (doc.status as RegularizationStatus) || 'pending',
    approverUserId: String(doc.approverUserId || ''),
    reviewNote: String(doc.reviewNote || ''),
  };
}

export function mapLeaveType(doc: Record<string, unknown>): LeaveType {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    name: String(doc.name || ''),
    code: String(doc.code || ''),
    paid: Boolean(doc.paid),
    accrualPerMonth: Number(doc.accrualPerMonth || 0),
    maxBalance: Number(doc.maxBalance || 0),
    carryForward: Boolean(doc.carryForward),
    status: (doc.status as 'active' | 'inactive') || 'active',
  };
}

export function mapThreePlVendor(doc: Record<string, unknown>): ThreePlVendor {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    name: String(doc.name || ''),
    contactName: String(doc.contactName || ''),
    contactEmail: String(doc.contactEmail || ''),
    contactPhone: String(doc.contactPhone || ''),
    status: (doc.status as 'active' | 'inactive') || 'active',
    $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
    $updatedAt: doc.$updatedAt ? String(doc.$updatedAt) : undefined,
  };
}

export function mapLeaveBalance(doc: Record<string, unknown>): LeaveBalance {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    leaveTypeId: String(doc.leaveTypeId || ''),
    year: Number(doc.year || 0),
    balance: Number(doc.balance || 0),
  };
}

export function mapLeaveRequest(doc: Record<string, unknown>): LeaveRequest {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    userId: String(doc.userId || ''),
    leaveTypeId: String(doc.leaveTypeId || ''),
    fromDate: String(doc.fromDate || ''),
    toDate: String(doc.toDate || ''),
    days: Number(doc.days || 0),
    status: (doc.status as LeaveRequestStatus) || 'pending',
    approverUserId: String(doc.approverUserId || ''),
    note: String(doc.note || ''),
  };
}

export function mapHoliday(doc: Record<string, unknown>): Holiday {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    date: String(doc.date || ''),
    name: String(doc.name || ''),
    region: String(doc.region || ''),
  };
}

export function mapSalaryStructure(doc: Record<string, unknown>): SalaryStructure {
  let components: SalaryComponent[] = [];
  if (typeof doc.components === 'string') {
    try {
      components = JSON.parse(doc.components) as SalaryComponent[];
    } catch {
      components = [];
    }
  }
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    employeeId: String(doc.employeeId || ''),
    effectiveFrom: String(doc.effectiveFrom || ''),
    components,
    ctcMonthly: Number(doc.ctcMonthly || 0),
    status: (doc.status as 'active' | 'inactive') || 'active',
  };
}

export function mapPayrollRun(doc: Record<string, unknown>): PayrollRun {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    month: String(doc.month || ''),
    status: (doc.status as PayrollRunStatus) || 'draft',
    totals: parseJson<Record<string, number>>(doc.totals, {}),
    notes: String(doc.notes || ''),
  };
}

export function mapPayslip(doc: Record<string, unknown>): Payslip {
  return {
    id: String(doc.$id),
    companyId: String(doc.companyId || ''),
    payrollRunId: String(doc.payrollRunId || ''),
    employeeId: String(doc.employeeId || ''),
    breakdown: parseJson<Record<string, unknown>>(doc.breakdown, {}),
    fileId: String(doc.fileId || ''),
    netPay: Number(doc.netPay || 0),
    month: String(doc.month || ''),
  };
}

export function mapAuditLog(doc: Record<string, unknown>): AuditLog {
  return {
    id: String(doc.$id),
    companyId: doc.companyId ? String(doc.companyId) : null,
    actorUserId: String(doc.actorUserId || ''),
    action: String(doc.action || ''),
    entityType: String(doc.entityType || ''),
    entityId: doc.entityId ? String(doc.entityId) : null,
    meta: parseJson<Record<string, unknown>>(doc.meta, {}),
    $createdAt: doc.$createdAt ? String(doc.$createdAt) : undefined,
  };
}

export function serializeCompanyPayload(input: {
  name: string;
  slug: string;
  teamId: string;
  plan?: string;
  featureFlags?: CompanyFeatureFlags;
  branding?: CompanyBranding;
  settings?: CompanySettings;
  status?: CompanyStatus;
  maxEmployees?: number;
  createdByUserId?: string | null;
}) {
  return {
    name: input.name,
    slug: input.slug,
    teamId: input.teamId,
    plan: input.plan || 'free',
    featureFlags: JSON.stringify(input.featureFlags || DEFAULT_FEATURE_FLAGS),
    branding: JSON.stringify(input.branding || DEFAULT_BRANDING),
    settings: JSON.stringify(input.settings || DEFAULT_SETTINGS),
    status: input.status || 'active',
    maxEmployees: input.maxEmployees ?? 50,
    ...(input.createdByUserId ? { createdByUserId: input.createdByUserId } : {}),
  };
}

export function employeeUpdatePayload(input: Partial<EmployeeMembership>) {
  const payload: Record<string, unknown> = {};
  const keys: (keyof EmployeeMembership)[] = [
    'name',
    'email',
    'role',
    'status',
    'employeeCode',
    'employmentType',
    'vendorId',
    'department',
    'designation',
    'reportingManagerUserId',
    'dateOfJoining',
    'grade',
    'costCenter',
    'phone',
    'dateOfBirth',
    'gender',
    'bloodGroup',
    'currentCity',
    'currentState',
    'currentAddressLine1',
    'currentAddressLine2',
    'currentPincode',
    'profilePictureFileId',
    'emergencyContactName',
    'emergencyContactPhone',
    'panNumber',
    'aadhaarNumber',
    'uanNumber',
    'esiNumber',
    'pfAccountNumber',
    'bankName',
    'bankIfsc',
    'bankAccountNumber',
    'primarySiteId',
    'attendancePolicy',
    'workShiftStart',
    'workShiftEnd',
    'shiftId',
    'mustChangePassword',
  ];
  for (const key of keys) {
    if (input[key] !== undefined) payload[key] = input[key];
  }
  if (input.alternateSiteIds !== undefined) {
    payload.alternateSiteIds = JSON.stringify(input.alternateSiteIds);
  }
  return payload;
}
