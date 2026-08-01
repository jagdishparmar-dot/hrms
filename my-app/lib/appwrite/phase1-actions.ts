'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ID, Query } from 'node-appwrite';

import {
  enrichShiftChangeRequests,
  listPendingShiftChangeRequests,
  reviewShiftChangeRequest,
} from '@/lib/appwrite/shift-change-requests';
import { writeAuditLog } from '@/lib/appwrite/audit';
import {
  closeOpenSegmentsForRegularization,
  OPEN_SHIFT_MAX_AGE_MS,
} from '@/lib/appwrite/attendance';
import {
  assignLeaveBalance,
  ensureLeaveBalance,
  getLeaveTypeName,
  listCompanyLeaveBalances,
  syncLeaveRequestToAttendance,
  validateLeaveApplication,
} from '@/lib/appwrite/leave';
import {
  deleteEmployeeDocument,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from '@/lib/appwrite/employee-profile';
import {
  requireCompanyAdmin,
  requireTenantMember,
  getCurrentUser,
} from '@/lib/appwrite/auth';
import { appwriteConfig, COMPANY_COOKIE, SESSION_COOKIE } from '@/lib/appwrite/config';
import { tenantHomePath } from '@/lib/appwrite/routing';
import { assertNotProtectedSuperAdmin } from '@/lib/appwrite/super-admin';
import {
  employeeCodeConfigFromSettings,
  formatEmployeeCode,
  shouldAllocateEmployeeCode,
} from '@/lib/employee-code';
import {
  buildSalaryComponents,
  computeCtcMonthly,
  defaultSalaryComponents,
} from '@/lib/salary-structure';
import {
  employeeUpdatePayload,
  mapAttendance,
  mapCompany,
  mapEmployee,
  mapHoliday,
  mapLeaveBalance,
  mapLeaveRequest,
  mapLeaveType,
  mapPayrollRun,
  mapPayslip,
  mapRegularization,
  mapSalaryStructure,
  mapSite,
  mapThreePlVendor,
  mapWorkShift,
  mapShiftAssignment,
} from '@/lib/appwrite/mappers';
import {
  employeeDocumentPermissions,
} from '@/lib/appwrite/permissions';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { attendanceRowsToCsv } from '@/lib/attendance-export';
import {
  ATTENDANCE_EXPORT_MAX,
  ATTENDANCE_PAGE_SIZE,
  type AttendanceListResult,
  type AttendanceQueryParams,
} from '@/lib/attendance-list';
import {
  REGISTER_EXPORT_MAX,
  REGISTER_PAGE_SIZE,
  buildRegisterRows,
  currentRegisterMonth,
  filterRegisterEmployees,
  getMonthDays,
  registerRowsToCsv,
  sortRegisterEmployees,
  type AttendanceRegisterFilters,
  type AttendanceRegisterResult,
  type RegisterDayFact,
} from '@/lib/attendance-register';
import type { SitesLiveSnapshot } from '@/lib/sites-live';
import type { DashboardSnapshot } from '@/lib/dashboard';
import {
  assignmentLookupKey,
  parseShiftRosterCsv,
  SHIFT_ROSTER_IMPORT_MAX_BYTES,
  shiftRosterCsvRowSchema,
} from '@/lib/shift-roster-import';
import {
  SHIFT_ROSTER_REGISTER_EXPORT_MAX,
  SHIFT_ROSTER_REGISTER_PAGE_SIZE,
  buildShiftAssignmentLabelMap,
  buildShiftRosterRows,
  shiftRosterRowsToCsv,
  type ShiftRosterRegisterFilters,
  type ShiftRosterRegisterResult,
} from '@/lib/shift-roster-register';
import type {
  AttendanceRecord,
  AttendanceRegularization,
  CompanySettings,
  EmployeeMembership,
  EmployeeLoginInfo,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PayrollRun,
  Payslip,
  SalaryStructure,
  Site,
  ThreePlVendor,
  WorkShift,
  EmployeeShiftAssignment,
  ShiftChangeRequest,
} from '@/lib/appwrite/types';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import {
  addDaysIso,
  dateIsoInTimeZone,
  inferCrossesMidnight,
  inferShiftType,
  zonedDateTimeToUtcMs,
  finalizeAttendanceOnPunchOut,
  resolvePunchOutOccurrence,
} from '@/lib/attendance-shift';
import {
  changePasswordSchema,
  createEmployeeSchema,
  generateRosterSchema,
  holidaySchema,
  leaveBalanceAssignSchema,
  leaveRequestSchema,
  leaveTypeSchema,
  payrollRunSchema,
  regularizationSchema,
  resetEmployeePasswordSchema,
  reviewLeaveSchema,
  reviewRegularizationSchema,
  reviewShiftChangeRequestSchema,
  salaryStructureSchema,
  setEmployeeLoginAccessSchema,
  shiftAssignmentSchema,
  shiftRosterCsvImportSchema,
  shiftSchema,
  siteSchema,
  threePlVendorSchema,
  updateEmployeeSchema,
} from '@/lib/schemas/phase1';

function toErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message || fallback);
  }
  return fallback;
}

async function isEmployeeCodeInUse(companyId: string, code: string) {
  if (!code) return false;
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.equal('employeeCode', code),
      Query.limit(1),
    ],
  );
  return result.total > 0;
}

async function allocateEmployeeCode(companyId: string) {
  const { databases } = createAdminClient();
  const companyDoc = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    companyId,
  );
  const settings = mapCompany(companyDoc as unknown as Record<string, unknown>)
    .settings;
  const config = employeeCodeConfigFromSettings(settings);
  let seq = config.nextSequence;

  for (let attempt = 0; attempt < 100; attempt++) {
    const code = formatEmployeeCode(config, seq);
    if (!(await isEmployeeCodeInUse(companyId, code))) {
      const nextSettings: CompanySettings = {
        ...settings,
        employeeCodePrefix: config.prefix,
        employeeCodePadding: config.padding,
        employeeCodeNextSequence: seq + 1,
        employeeCodeAutoGenerate: config.autoGenerate,
      };
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.companiesCollectionId,
        companyId,
        { settings: JSON.stringify(nextSettings) },
      );
      return { code, settings: nextSettings };
    }
    seq += 1;
  }

  throw new Error('Unable to allocate a unique employee code.');
}

async function getActiveThreePlVendor(
  companyId: string,
  vendorId: string,
): Promise<ThreePlVendor | null> {
  if (!vendorId) return null;
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.threePlVendorsCollectionId,
      vendorId,
    );
    const vendor = mapThreePlVendor(doc as unknown as Record<string, unknown>);
    if (vendor.companyId !== companyId || vendor.status !== 'active') {
      return null;
    }
    return vendor;
  } catch {
    return null;
  }
}

function validateConfiguredOrgFields(
  data: {
    department?: string;
    designation?: string;
  },
  settings: { departments: string[]; designations: string[] },
) {
  const department = data.department?.trim();
  if (settings.departments.length > 0) {
    if (!department) {
      return 'Department is required. Select one from company settings.';
    }
    if (!settings.departments.includes(department)) {
      return 'Department must be selected from company settings.';
    }
  }

  const designation = data.designation?.trim();
  if (settings.designations.length > 0) {
    if (!designation) {
      return 'Designation is required. Select one from company settings.';
    }
    if (!settings.designations.includes(designation)) {
      return 'Designation must be selected from company settings.';
    }
  }

  return null;
}

function resolveEmployeeVendorId(
  employmentType: string | undefined,
  vendorId: string | undefined,
) {
  return employmentType === '3PL' ? vendorId?.trim() || '' : '';
}

async function resolveEmployeeShiftAssignment(
  companyId: string,
  shiftId: string | undefined,
  fallbackStart: string,
  fallbackEnd: string,
) {
  const id = shiftId?.trim() || '';
  if (!id) {
    return {
      shiftId: '',
      workShiftStart: fallbackStart || '09:00',
      workShiftEnd: fallbackEnd || '18:00',
    };
  }
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      id,
    );
    const shift = mapWorkShift(doc as unknown as Record<string, unknown>);
    if (shift.companyId !== companyId || shift.status !== 'active') {
      return null;
    }
    return {
      shiftId: shift.id,
      workShiftStart: shift.startTime,
      workShiftEnd: shift.endTime,
    };
  } catch {
    return null;
  }
}

async function assertCanManageEmployeeLogin(
  employee: EmployeeMembership,
  actorUserId: string,
  actionLabel: string,
) {
  if (employee.userId === actorUserId) {
    throw new Error(`You cannot ${actionLabel} your own login from this screen.`);
  }
  assertNotProtectedSuperAdmin(employee.email, actionLabel);
}

function mapEmployeeLoginInfo(
  employee: EmployeeMembership,
  authUser: {
    email?: string;
    emailVerification?: boolean;
    status?: boolean;
    accessedAt?: string;
    registration?: string;
  } | null,
): EmployeeLoginInfo {
  const authUserActive = authUser?.status !== false;
  const employeeActive = employee.status === 'active';

  return {
    userId: employee.userId,
    email: authUser?.email || employee.email,
    role: employee.role,
    employeeStatus: employee.status,
    authUserActive,
    emailVerified: Boolean(authUser?.emailVerification),
    mustChangePassword: employee.mustChangePassword,
    lastAccessAt: authUser?.accessedAt || null,
    registeredAt: authUser?.registration || null,
    loginAllowed: employeeActive && authUserActive,
  };
}

// ——— Employees ———

export async function listEmployeesAction(search = '') {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [
      Query.equal('companyId', ctx.company.id),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ],
  );
  let employees = result.documents.map((d) =>
    mapEmployee(d as unknown as Record<string, unknown>),
  );
  const q = search.trim().toLowerCase();
  if (q) {
    employees = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q),
    );
  }
  return { ok: true as const, employees, error: null };
}

export async function getEmployeeAction(employeeId: string) {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const doc = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    employeeId,
  );
  const employee = mapEmployee(doc as unknown as Record<string, unknown>);
  if (employee.companyId !== ctx.company.id) {
    throw new Error('Employee not in this company.');
  }
  return employee;
}

export async function createEmployeeAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = createEmployeeSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    employeeCode: formData.get('employeeCode') || '',
    employmentType: formData.get('employmentType') || 'Permanent',
    vendorId: formData.get('vendorId') || '',
    department: formData.get('department') || '',
    designation: formData.get('designation') || '',
    phone: formData.get('phone') || '',
    attendancePolicy: formData.get('attendancePolicy') || 'geofenced',
    primarySiteId: formData.get('primarySiteId') || '',
    workShiftStart: formData.get('workShiftStart') || '09:00',
    workShiftEnd: formData.get('workShiftEnd') || '18:00',
    shiftId: formData.get('shiftId') || '',
    role: formData.get('role') || 'employee',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const orgError = validateConfiguredOrgFields(data, ctx.company.settings);
  if (orgError) {
    return { ok: false as const, error: orgError };
  }

  const vendorId = resolveEmployeeVendorId(data.employmentType, data.vendorId);
  if (data.employmentType === '3PL') {
    const vendor = await getActiveThreePlVendor(ctx.company.id, vendorId);
    if (!vendor) {
      return { ok: false as const, error: 'Select a valid 3PL manpower provider.' };
    }
  }

  const shiftAssignment = await resolveEmployeeShiftAssignment(
    ctx.company.id,
    data.shiftId,
    data.workShiftStart,
    data.workShiftEnd,
  );
  if (!shiftAssignment) {
    return { ok: false as const, error: 'Select a valid active shift, or leave shift blank.' };
  }

  let employeeCode = (data.employeeCode || '').trim();

  if (shouldAllocateEmployeeCode(ctx.company.settings, employeeCode)) {
    try {
      const allocated = await allocateEmployeeCode(ctx.company.id);
      employeeCode = allocated.code;
    } catch (error) {
      return {
        ok: false as const,
        error: toErrorMessage(error, 'Unable to generate employee code.'),
      };
    }
  } else if (!employeeCode) {
    return {
      ok: false as const,
      error: 'Employee code is required, or enable auto-generation in Company settings.',
    };
  } else if (await isEmployeeCodeInUse(ctx.company.id, employeeCode)) {
    return { ok: false as const, error: 'Employee code is already in use.' };
  }

  try {
    const { databases, users, teams } = createAdminClient();
    const count = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.equal('status', 'active'), Query.limit(1)],
    );
    if (count.total >= ctx.company.maxEmployees) {
      return { ok: false as const, error: `Employee limit reached (${ctx.company.maxEmployees}).` };
    }

    const user = await users.create(
      ID.unique(),
      data.email,
      undefined,
      data.password,
      data.name,
    );
    await teams.createMembership(
      ctx.company.teamId,
      [data.role],
      undefined,
      user.$id,
    );

    const doc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        userId: user.$id,
        teamId: ctx.company.teamId,
        email: data.email,
        name: data.name,
        role: data.role,
        status: 'active',
        employeeCode,
        employmentType: data.employmentType,
        vendorId,
        department: data.department || '',
        designation: data.designation || '',
        phone: data.phone || '',
        attendancePolicy: data.attendancePolicy,
        primarySiteId: data.primarySiteId || '',
        alternateSiteIds: '[]',
        workShiftStart: shiftAssignment.workShiftStart,
        workShiftEnd: shiftAssignment.workShiftEnd,
        shiftId: shiftAssignment.shiftId,
        mustChangePassword: true,
        reportingManagerUserId: '',
        dateOfJoining: '',
        grade: '',
        costCenter: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        currentCity: '',
        currentState: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        panNumber: '',
        aadhaarNumber: '',
        uanNumber: '',
        esiNumber: '',
        pfAccountNumber: '',
        bankName: '',
        bankIfsc: '',
        bankAccountNumber: '',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.created',
      entityType: 'employee',
      entityId: doc.$id,
      meta: { email: data.email },
    });

    const salaryEffectiveFrom = dateIsoInTimeZone(
      Date.now(),
      ctx.company.settings.timezone || 'Asia/Kolkata',
    );
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.salaryStructuresCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        employeeId: doc.$id,
        effectiveFrom: salaryEffectiveFrom,
        components: JSON.stringify(defaultSalaryComponents()),
        ctcMonthly: 0,
        status: 'active',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );

    return { ok: true as const, employeeId: doc.$id };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to create employee.') };
  }
}

export async function updateEmployeeAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = updateEmployeeSchema.safeParse({
    employeeId: formData.get('employeeId'),
    name: formData.get('name'),
    employeeCode: formData.get('employeeCode') || '',
    employmentType: formData.get('employmentType') || undefined,
    vendorId: formData.get('vendorId') || '',
    department: formData.get('department') || '',
    designation: formData.get('designation') || '',
    phone: formData.get('phone') || '',
    dateOfJoining: formData.get('dateOfJoining') || '',
    grade: formData.get('grade') || '',
    costCenter: formData.get('costCenter') || '',
    dateOfBirth: formData.get('dateOfBirth') || '',
    gender: formData.get('gender') || '',
    bloodGroup: formData.get('bloodGroup') || '',
    currentCity: formData.get('currentCity') || '',
    currentState: formData.get('currentState') || '',
    currentAddressLine1: formData.get('currentAddressLine1') || '',
    currentAddressLine2: formData.get('currentAddressLine2') || '',
    currentPincode: formData.get('currentPincode') || '',
    emergencyContactName: formData.get('emergencyContactName') || '',
    emergencyContactPhone: formData.get('emergencyContactPhone') || '',
    panNumber: formData.get('panNumber') || '',
    aadhaarNumber: formData.get('aadhaarNumber') || '',
    uanNumber: formData.get('uanNumber') || '',
    esiNumber: formData.get('esiNumber') || '',
    pfAccountNumber: formData.get('pfAccountNumber') || '',
    bankName: formData.get('bankName') || '',
    bankIfsc: formData.get('bankIfsc') || '',
    bankAccountNumber: formData.get('bankAccountNumber') || '',
    attendancePolicy: formData.get('attendancePolicy') || undefined,
    primarySiteId: formData.get('primarySiteId') || '',
    workShiftStart: formData.get('workShiftStart') || '',
    workShiftEnd: formData.get('workShiftEnd') || '',
    shiftId: formData.get('shiftId') || '',
    status: formData.get('status') || undefined,
    role: formData.get('role') || undefined,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const orgError = validateConfiguredOrgFields(parsed.data, ctx.company.settings);
  if (orgError) {
    return { ok: false as const, error: orgError };
  }

  try {
    const employee = await getEmployeeAction(parsed.data.employeeId);
    const employmentType =
      parsed.data.employmentType ?? (employee.employmentType || 'Permanent');
    const nextPolicy = parsed.data.attendancePolicy ?? employee.attendancePolicy ?? 'geofenced';
    const nextPrimarySiteId =
      parsed.data.primarySiteId !== undefined
        ? parsed.data.primarySiteId
        : employee.primarySiteId;
    if (nextPolicy === 'geofenced' && !nextPrimarySiteId.trim()) {
      return {
        ok: false as const,
        error: 'Primary site is required for geofenced attendance.',
      };
    }
    const vendorId = resolveEmployeeVendorId(employmentType, parsed.data.vendorId);
    if (employmentType === '3PL') {
      const vendor = await getActiveThreePlVendor(ctx.company.id, vendorId);
      if (!vendor) {
        return { ok: false as const, error: 'Select a valid 3PL manpower provider.' };
      }
    }

    const shiftAssignment = await resolveEmployeeShiftAssignment(
      ctx.company.id,
      parsed.data.shiftId,
      parsed.data.workShiftStart || employee.workShiftStart,
      parsed.data.workShiftEnd || employee.workShiftEnd,
    );
    if (!shiftAssignment) {
      return { ok: false as const, error: 'Select a valid active shift, or leave shift blank.' };
    }

    const { databases } = createAdminClient();
    const { employeeId: _id, ...rest } = parsed.data;
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employee.id,
      employeeUpdatePayload({
        ...rest,
        vendorId,
        shiftId: shiftAssignment.shiftId,
        workShiftStart: shiftAssignment.workShiftStart,
        workShiftEnd: shiftAssignment.workShiftEnd,
      }),
    );
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.updated',
      entityType: 'employee',
      entityId: employee.id,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to update employee.') };
  }
}

export async function deactivateEmployeeAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const employeeId = String(formData.get('employeeId') || '');
  if (!employeeId) {
    return { ok: false as const, error: 'Employee id is required.' };
  }

  try {
    const employee = await getEmployeeAction(employeeId);
    if (employee.userId === ctx.user.$id) {
      return { ok: false as const, error: 'You cannot deactivate your own account.' };
    }
    try {
      assertNotProtectedSuperAdmin(employee.email, 'deactivate');
    } catch (guardError) {
      return {
        ok: false as const,
        error:
          guardError instanceof Error
            ? guardError.message
            : 'Protected Super Admin account.',
      };
    }
    const { databases } = createAdminClient();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employee.id,
      { status: 'inactive' },
    );
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.deactivated',
      entityType: 'employee',
      entityId: employee.id,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to deactivate employee.') };
  }
}

export async function getEmployeeLoginInfoAction(
  employeeId: string,
): Promise<
  { ok: true; info: EmployeeLoginInfo } | { ok: false; error: string }
> {
  await requireCompanyAdmin();
  try {
    const employee = await getEmployeeAction(employeeId);
    const { users } = createAdminClient();
    try {
      const authUser = await users.get(employee.userId);
      return {
        ok: true as const,
        info: mapEmployeeLoginInfo(employee, {
          email: authUser.email,
          emailVerification: authUser.emailVerification,
          status: authUser.status,
          accessedAt: authUser.accessedAt,
          registration: authUser.registration,
        }),
      };
    } catch {
      return {
        ok: true as const,
        info: mapEmployeeLoginInfo(employee, null),
      };
    }
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to load login information.'),
    };
  }
}

export async function resetEmployeePasswordByAdminAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = resetEmployeePasswordSchema.safeParse({
    employeeId: formData.get('employeeId'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid input.',
    };
  }

  try {
    const employee = await getEmployeeAction(parsed.data.employeeId);
    await assertCanManageEmployeeLogin(
      employee,
      ctx.user.$id,
      'reset the password for',
    );

    const { databases, users } = createAdminClient();
    await users.updatePassword(employee.userId, parsed.data.newPassword);
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employee.id,
      { mustChangePassword: true },
    );

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.password_reset',
      entityType: 'employee',
      entityId: employee.id,
      meta: { targetUserId: employee.userId },
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to reset password.'),
    };
  }
}

export async function setEmployeeLoginAccessAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = setEmployeeLoginAccessSchema.safeParse({
    employeeId: formData.get('employeeId'),
    blocked: formData.get('blocked'),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid input.',
    };
  }

  try {
    const employee = await getEmployeeAction(parsed.data.employeeId);
    await assertCanManageEmployeeLogin(
      employee,
      ctx.user.$id,
      parsed.data.blocked ? 'block' : 'unblock',
    );

    const { databases, users } = createAdminClient();
    const blocked = parsed.data.blocked;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employee.id,
      { status: blocked ? 'inactive' : 'active' },
    );
    await users.updateStatus(employee.userId, !blocked);

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: blocked ? 'employee.login_blocked' : 'employee.login_unblocked',
      entityType: 'employee',
      entityId: employee.id,
      meta: { targetUserId: employee.userId },
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to update login access.'),
    };
  }
}

export async function deleteEmployeeAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const employeeId = String(formData.get('employeeId') || '');
  if (!employeeId) {
    return { ok: false as const, error: 'Employee id is required.' };
  }

  try {
    const employee = await getEmployeeAction(employeeId);
    if (employee.userId === ctx.user.$id) {
      return { ok: false as const, error: 'You cannot delete your own account.' };
    }
    try {
      assertNotProtectedSuperAdmin(employee.email, 'delete');
    } catch (guardError) {
      return {
        ok: false as const,
        error:
          guardError instanceof Error
            ? guardError.message
            : 'Protected Super Admin account.',
      };
    }

    const { databases, users, teams } = createAdminClient();

    try {
      const memberships = await teams.listMemberships(ctx.company.teamId, [
        Query.equal('userId', employee.userId),
        Query.limit(25),
      ]);
      for (const membership of memberships.memberships) {
        await teams.deleteMembership(ctx.company.teamId, membership.$id);
      }
    } catch {
      /* membership may already be gone */
    }

    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employee.id,
    );

    const otherMemberships = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('userId', employee.userId), Query.limit(1)],
    );
    if (otherMemberships.total === 0) {
      try {
        await users.delete(employee.userId);
      } catch {
        /* user may already be gone */
      }
    }

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.deleted',
      entityType: 'employee',
      entityId: employee.id,
      meta: { email: employee.email },
    });

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to delete employee.') };
  }
}

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  try {
    const secret = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!secret) redirect('/login');
    const { account } = createSessionClient(secret);
    await account.updatePassword(parsed.data.newPassword, parsed.data.currentPassword);

    const { databases } = createAdminClient();
    const memberships = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('userId', user.$id), Query.limit(50)],
    );
    for (const doc of memberships.documents) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.employeesCollectionId,
        doc.$id,
        { mustChangePassword: false },
      );
    }

    const jar = await cookies();
    const companyId = jar.get(COMPANY_COOKIE)?.value;
    const activeMembership = companyId
      ? memberships.documents.find((doc) => String(doc.companyId) === companyId)
      : memberships.documents[0];
    const role = activeMembership ? String(activeMembership.role || 'employee') : 'employee';
    redirect(tenantHomePath(role));
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      String((error as { digest?: string }).digest || '').startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
    return { ok: false as const, error: toErrorMessage(error, 'Unable to change password.') };
  }
}

export async function requirePasswordChangeContext() {
  return requireTenantMember({ allowPasswordChange: true });
}

// ——— Shifts ———

export async function listShiftsAction(): Promise<WorkShift[]> {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.limit(100)],
    );
    return result.documents.map((d) => mapWorkShift(d as unknown as Record<string, unknown>));
  } catch {
    // Collection may not be provisioned yet.
    return [];
  }
}

export async function upsertShiftAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = shiftSchema.safeParse({
    shiftId: formData.get('shiftId') || undefined,
    name: formData.get('name'),
    code: formData.get('code'),
    shiftType: formData.get('shiftType') || 'general',
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    punchInBeforeMinutes: formData.get('punchInBeforeMinutes') || 120,
    punchInAfterMinutes: formData.get('punchInAfterMinutes') || 240,
    punchOutBeforeMinutes: formData.get('punchOutBeforeMinutes') || 120,
    punchOutAfterMinutes: formData.get('punchOutAfterMinutes') || 240,
    lateGraceMinutes: formData.get('lateGraceMinutes') || 15,
    earlyLeaveGraceMinutes: formData.get('earlyLeaveGraceMinutes') || 15,
    fullDayMinutes: formData.get('fullDayMinutes') || 480,
    halfDayMinutes: formData.get('halfDayMinutes') || 240,
    overtimeAfterMinutes: formData.get('overtimeAfterMinutes') || 480,
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const crossesMidnight = inferCrossesMidnight(data.startTime, data.endTime);
  const shiftType =
    data.shiftType === 'general' && crossesMidnight
      ? 'cross_midnight'
      : data.shiftType === 'general'
        ? inferShiftType(data.startTime, data.endTime)
        : data.shiftType;

  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    name: data.name,
    code: data.code.toUpperCase(),
    shiftType,
    startTime: data.startTime,
    endTime: data.endTime,
    crossesMidnight,
    punchInBeforeMinutes: data.punchInBeforeMinutes,
    punchInAfterMinutes: data.punchInAfterMinutes,
    punchOutBeforeMinutes: data.punchOutBeforeMinutes,
    punchOutAfterMinutes: data.punchOutAfterMinutes,
    lateGraceMinutes: data.lateGraceMinutes,
    earlyLeaveGraceMinutes: data.earlyLeaveGraceMinutes,
    fullDayMinutes: data.fullDayMinutes,
    halfDayMinutes: data.halfDayMinutes,
    overtimeAfterMinutes: data.overtimeAfterMinutes,
    status: data.status,
  };

  try {
    if (data.shiftId) {
      const existing = mapWorkShift(
        (await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftsCollectionId,
          data.shiftId,
        )) as unknown as Record<string, unknown>,
      );
      if (existing.companyId !== ctx.company.id) {
        return { ok: false as const, error: 'Shift not found.' };
      }
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftsCollectionId,
        data.shiftId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftsCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save shift.') };
  }
}

// ——— Shift roster (rotational / multi-shift) ———

export async function listShiftAssignmentsAction(params?: {
  from?: string;
  to?: string;
  employeeId?: string;
}): Promise<EmployeeShiftAssignment[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  try {
    const queries = [
      Query.equal('companyId', ctx.company.id),
      Query.orderAsc('dateIso'),
      Query.limit(500),
    ];
    if (params?.employeeId) queries.push(Query.equal('employeeId', params.employeeId));
    if (params?.from) queries.push(Query.greaterThanEqual('dateIso', params.from));
    if (params?.to) queries.push(Query.lessThanEqual('dateIso', params.to));

    const [result, shifts, employees] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.shiftAssignmentsCollectionId,
        queries,
      ),
      listShiftsAction(),
      listEmployeesAction(),
    ]);
    const shiftById = new Map(shifts.map((s) => [s.id, s]));
    const empById = new Map(employees.employees.map((e) => [e.id, e]));

    return result.documents.map((doc) => {
      const row = mapShiftAssignment(doc as unknown as Record<string, unknown>);
      const shift = shiftById.get(row.shiftId);
      const emp = empById.get(row.employeeId);
      return {
        ...row,
        shiftName: shift?.name,
        shiftCode: shift?.code,
        employeeName: emp?.name,
      };
    });
  } catch {
    return [];
  }
}

export async function upsertShiftAssignmentAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = shiftAssignmentSchema.safeParse({
    assignmentId: formData.get('assignmentId') || undefined,
    employeeId: formData.get('employeeId'),
    dateIso: formData.get('dateIso'),
    shiftId: formData.get('shiftId'),
    sequence: formData.get('sequence') || 1,
    siteId: formData.get('siteId') || '',
    note: formData.get('note') || '',
    status: formData.get('status') || 'scheduled',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const employee = await getEmployeeAction(data.employeeId);
  const shift = await databasesGetShift(ctx.company.id, data.shiftId);
  if (!shift) {
    return { ok: false as const, error: 'Select a valid active shift.' };
  }

  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    employeeId: employee.id,
    dateIso: data.dateIso,
    shiftId: data.shiftId,
    sequence: data.sequence,
    siteId: data.siteId || employee.primarySiteId || '',
    status: data.status,
    note: data.note || '',
  };

  try {
    if (data.assignmentId) {
      const existing = mapShiftAssignment(
        (await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftAssignmentsCollectionId,
          data.assignmentId,
        )) as unknown as Record<string, unknown>,
      );
      if (existing.companyId !== ctx.company.id) {
        return { ok: false as const, error: 'Assignment not found.' };
      }
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftAssignmentsCollectionId,
        data.assignmentId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftAssignmentsCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save roster entry.') };
  }
}

export async function listShiftChangeRequestsAction(): Promise<ShiftChangeRequest[]> {
  const ctx = await requireCompanyAdmin();
  const [rows, employees, shifts] = await Promise.all([
    listPendingShiftChangeRequests(ctx.company.id),
    listEmployeesAction(),
    listShiftsAction(),
  ]);
  return enrichShiftChangeRequests(
    ctx.company.id,
    rows,
    employees.employees.map((e) => ({ id: e.id, name: e.name })),
    shifts,
  );
}

export async function reviewShiftChangeRequestAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = reviewShiftChangeRequestSchema.safeParse({
    requestId: formData.get('requestId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  try {
    return await reviewShiftChangeRequest({
      company: ctx.company,
      approverUserId: ctx.user.$id,
      requestId: parsed.data.requestId,
      decision: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
    });
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to review request.') };
  }
}

async function databasesGetShift(companyId: string, shiftId: string) {
  try {
    const { databases } = createAdminClient();
    const shift = mapWorkShift(
      (await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftsCollectionId,
        shiftId,
      )) as unknown as Record<string, unknown>,
    );
    if (shift.companyId !== companyId || shift.status !== 'active') return null;
    return shift;
  } catch {
    return null;
  }
}

async function databasesGetShiftByCode(companyId: string, code: string) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.shiftsCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.equal('code', code),
      Query.equal('status', 'active'),
      Query.limit(1),
    ],
  );
  if (result.documents.length === 0) return null;
  return mapWorkShift(result.documents[0] as unknown as Record<string, unknown>);
}

async function resolveShiftPatternToken(companyId: string, token: string) {
  const byId = await databasesGetShift(companyId, token);
  if (byId) return byId;
  return databasesGetShiftByCode(companyId, token);
}

export async function deleteShiftAssignmentAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const assignmentId = String(formData.get('assignmentId') || '');
  if (!assignmentId) {
    return { ok: false as const, error: 'Assignment id is required.' };
  }
  try {
    const { databases } = createAdminClient();
    const existing = mapShiftAssignment(
      (await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.shiftAssignmentsCollectionId,
        assignmentId,
      )) as unknown as Record<string, unknown>,
    );
    if (existing.companyId !== ctx.company.id) {
      return { ok: false as const, error: 'Assignment not found.' };
    }
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      assignmentId,
    );
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to delete assignment.') };
  }
}

export async function generateRotationalRosterAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = generateRosterSchema.safeParse({
    employeeId: formData.get('employeeId'),
    startDate: formData.get('startDate'),
    days: formData.get('days') || 7,
    pattern: formData.get('pattern'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  await getEmployeeAction(data.employeeId);
  const tokens = data.pattern
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return { ok: false as const, error: 'Pattern must include at least one shift code or OFF.' };
  }

  const { databases } = createAdminClient();
  let created = 0;
  for (let i = 0; i < data.days; i += 1) {
    const dateIso = addDaysIso(data.startDate, i);
    const token = tokens[i % tokens.length]!;
    if (token.toUpperCase() === 'OFF') continue;
    const shift = await resolveShiftPatternToken(ctx.company.id, token);
    if (!shift) {
      return {
        ok: false as const,
        error: `Unknown shift in pattern: ${token}`,
      };
    }
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        employeeId: data.employeeId,
        dateIso,
        shiftId: shift.id,
        sequence: 1,
        siteId: '',
        status: 'scheduled',
        note: 'Generated rotational roster',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );
    created += 1;
  }
  return { ok: true as const, created };
}

async function fetchShiftAssignmentsInRange(
  companyId: string,
  from: string,
  to: string,
): Promise<EmployeeShiftAssignment[]> {
  const { databases } = createAdminClient();
  const rows: EmployeeShiftAssignment[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.greaterThanEqual('dateIso', from),
        Query.lessThanEqual('dateIso', to),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );
    rows.push(
      ...result.documents.map((doc) =>
        mapShiftAssignment(doc as unknown as Record<string, unknown>),
      ),
    );
    if (result.documents.length < limit) break;
    offset += limit;
    if (offset >= 5000) break;
  }

  return rows;
}

export async function importShiftRosterCsvAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const meta = shiftRosterCsvImportSchema.safeParse({
    fileName: formData.get('fileName') || '',
  });
  if (!meta.success) {
    return { ok: false as const, error: meta.error.issues[0]?.message || 'Invalid upload.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Select a CSV file to upload.' };
  }
  if (file.size === 0) {
    return { ok: false as const, error: 'CSV file is empty.' };
  }
  if (file.size > SHIFT_ROSTER_IMPORT_MAX_BYTES) {
    return {
      ok: false as const,
      error: `File exceeds the ${Math.round(SHIFT_ROSTER_IMPORT_MAX_BYTES / 1024)} KB limit.`,
    };
  }

  const fileName = file.name || meta.data.fileName || '';
  if (
    fileName &&
    !/\.csv$/i.test(fileName) &&
    file.type &&
    !/(csv|text\/plain)/i.test(file.type)
  ) {
    return { ok: false as const, error: 'Upload a .csv file.' };
  }

  const parsedCsv = parseShiftRosterCsv(await file.text());
  if (!parsedCsv.ok) {
    return { ok: false as const, error: parsedCsv.error };
  }

  const [employees, shifts] = await Promise.all([
    fetchAllActiveEmployees(ctx.company.id),
    listShiftsAction(),
  ]);

  const employeeByCode = new Map<string, EmployeeMembership>();
  for (const employee of employees) {
    const key = employee.employeeCode.trim().toUpperCase();
    if (key) employeeByCode.set(key, employee);
  }

  const shiftByCode = new Map<string, WorkShift>();
  for (const shift of shifts) {
    if (shift.status !== 'active') continue;
    const key = shift.code.trim().toUpperCase();
    if (key) shiftByCode.set(key, shift);
  }

  type ImportRow = {
    lineNumber: number;
    employeeId: string;
    shiftId?: string;
    dateIso: string;
    sequence: number;
    note: string;
    clearOnly: boolean;
    siteId: string;
  };

  const validRows: ImportRow[] = [];
  const errors: string[] = [];

  for (const { lineNumber, raw } of parsedCsv.rows) {
    const rowParsed = shiftRosterCsvRowSchema.safeParse({
      employeeCode: raw.employeeCode,
      shiftCode: raw.shiftCode,
      dateIso: raw.dateIso,
      sequence: raw.sequence || 1,
      note: raw.note || '',
    });
    if (!rowParsed.success) {
      errors.push(
        `Row ${lineNumber}: ${rowParsed.error.issues[0]?.message || 'Invalid row.'}`,
      );
      continue;
    }

    const row = rowParsed.data;
    const employee = employeeByCode.get(row.employeeCode.toUpperCase());
    if (!employee) {
      errors.push(`Row ${lineNumber}: Unknown employee code "${row.employeeCode}".`);
      continue;
    }

    if (row.shiftCode.toUpperCase() === 'OFF') {
      validRows.push({
        lineNumber,
        employeeId: employee.id,
        dateIso: row.dateIso,
        sequence: row.sequence,
        note: row.note || '',
        clearOnly: true,
        siteId: employee.primarySiteId || '',
      });
      continue;
    }

    const shift = shiftByCode.get(row.shiftCode.toUpperCase());
    if (!shift) {
      errors.push(`Row ${lineNumber}: Unknown shift code "${row.shiftCode}".`);
      continue;
    }

    validRows.push({
      lineNumber,
      employeeId: employee.id,
      shiftId: shift.id,
      dateIso: row.dateIso,
      sequence: row.sequence,
      note: row.note || '',
      clearOnly: false,
      siteId: employee.primarySiteId || '',
    });
  }

  if (validRows.length === 0) {
    return {
      ok: false as const,
      error: errors[0] || 'No valid rows to import.',
      errors,
    };
  }

  const sortedDates = validRows.map((row) => row.dateIso).sort();
  const existing = await fetchShiftAssignmentsInRange(
    ctx.company.id,
    sortedDates[0]!,
    sortedDates[sortedDates.length - 1]!,
  );
  const existingByKey = new Map(
    existing.map((row) => [
      assignmentLookupKey(row.employeeId, row.dateIso, row.sequence),
      row,
    ]),
  );

  const { databases } = createAdminClient();
  let created = 0;
  let updated = 0;
  let cleared = 0;

  try {
    for (const row of validRows) {
      const key = assignmentLookupKey(row.employeeId, row.dateIso, row.sequence);
      const existingRow = existingByKey.get(key);

      if (row.clearOnly) {
        if (existingRow) {
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.shiftAssignmentsCollectionId,
            existingRow.id,
          );
          existingByKey.delete(key);
          cleared += 1;
        }
        continue;
      }

      const payload = {
        companyId: ctx.company.id,
        employeeId: row.employeeId,
        dateIso: row.dateIso,
        shiftId: row.shiftId!,
        sequence: row.sequence,
        siteId: row.siteId,
        status: 'scheduled' as const,
        note: row.note || '',
      };

      if (existingRow) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftAssignmentsCollectionId,
          existingRow.id,
          payload,
        );
        updated += 1;
      } else {
        const doc = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftAssignmentsCollectionId,
          ID.unique(),
          payload,
          employeeDocumentPermissions(ctx.company.teamId),
        );
        existingByKey.set(
          key,
          mapShiftAssignment(doc as unknown as Record<string, unknown>),
        );
        created += 1;
      }
    }
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to import roster CSV.'),
    };
  }

  await writeAuditLog({
    companyId: ctx.company.id,
    teamId: ctx.company.teamId,
    actorUserId: ctx.user.$id,
    action: 'shift_roster.csv_imported',
    entityType: 'shift_assignment',
    meta: {
      fileName: fileName || undefined,
      created,
      updated,
      cleared,
      failed: errors.length,
      totalRows: parsedCsv.rows.length,
    },
  });

  return {
    ok: true as const,
    created,
    updated,
    cleared,
    failed: errors.length,
    errors: errors.slice(0, 50),
    totalRows: parsedCsv.rows.length,
  };
}

async function buildShiftRosterRegister(
  filters: ShiftRosterRegisterFilters,
  options: { paginate: boolean },
): Promise<ShiftRosterRegisterResult> {
  const ctx = await requireCompanyAdmin();
  const month = /^\d{4}-\d{2}$/.test(filters.month) ? filters.month : currentRegisterMonth();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(
    options.paginate ? 100 : SHIFT_ROSTER_REGISTER_EXPORT_MAX,
    filters.pageSize ?? SHIFT_ROSTER_REGISTER_PAGE_SIZE,
  );
  const sort = filters.sort === 'name' ? 'name' : 'code';
  const { daysInMonth, monthDays } = getMonthDays(month);
  const from = monthDays[0]!;
  const to = monthDays[monthDays.length - 1]!;

  const [employees, sites, shifts, assignments] = await Promise.all([
    fetchAllActiveEmployees(ctx.company.id),
    listSitesAction(),
    listShiftsAction(),
    fetchShiftAssignmentsInRange(ctx.company.id, from, to),
  ]);

  const shiftCodeById = new Map(
    shifts.map((shift) => [shift.id, shift.code.trim().toUpperCase()]),
  );
  const assignmentLabels = buildShiftAssignmentLabelMap(assignments, shiftCodeById);
  const siteNameById = new Map(sites.map((site) => [site.id, site.name]));
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  const designations = [...new Set(employees.map((e) => e.designation).filter(Boolean))].sort();
  const branches = sites
    .filter((site) => site.status === 'active')
    .map((site) => ({ id: site.id, name: site.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const shiftCodes = shifts
    .filter((shift) => shift.status === 'active')
    .map((shift) => shift.code.trim().toUpperCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  const filtered = sortRegisterEmployees(
    filterRegisterEmployees(employees, filters, siteNameById),
    sort,
  );
  const total = filtered.length;
  const slice = options.paginate
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : filtered.slice(0, SHIFT_ROSTER_REGISTER_EXPORT_MAX);

  const rows = buildShiftRosterRows(slice, month, assignmentLabels);

  return {
    month,
    daysInMonth,
    monthDays,
    rows,
    total,
    page,
    pageSize,
    departments,
    designations,
    branches,
    shiftCodes,
  };
}

export async function getShiftRosterRegisterAction(
  filters: ShiftRosterRegisterFilters,
): Promise<ShiftRosterRegisterResult> {
  return buildShiftRosterRegister(filters, { paginate: true });
}

export async function exportShiftRosterRegisterCsvAction(filters: ShiftRosterRegisterFilters) {
  await requireCompanyAdmin();
  const register = await buildShiftRosterRegister(filters, { paginate: false });
  if (register.rows.length === 0) {
    return { ok: false as const, error: 'No employees match these filters for export.' };
  }
  return {
    ok: true as const,
    csv: shiftRosterRowsToCsv(register.rows, register.month, register.daysInMonth),
    rowCount: register.rows.length,
    month: register.month,
  };
}

// ——— Sites ———

export async function listSitesAction(): Promise<Site[]> {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.sitesCollectionId,
    [Query.equal('companyId', ctx.company.id), Query.limit(100)],
  );
  return result.documents.map((d) => mapSite(d as unknown as Record<string, unknown>));
}

const LIVE_PUNCH_CUTOFF_MS = OPEN_SHIFT_MAX_AGE_MS;

export async function getSitesLivePresenceAction(): Promise<SitesLiveSnapshot> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const cutoff = Date.now() - LIVE_PUNCH_CUTOFF_MS;

  const [attendanceResult, employeesResult, sites] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.isNull('clockOutTime'),
        Query.isNotNull('clockInTime'),
        Query.orderDesc('clockInTimestamp'),
        Query.limit(200),
      ],
    ),
    listEmployeesAction(),
    listSitesAction(),
  ]);

  const employeeById = new Map(
    employeesResult.employees.map((employee) => [employee.id, employee]),
  );
  const siteById = new Map(sites.map((site) => [site.id, site]));

  const checkedIn = attendanceResult.documents
    .map((doc) => mapAttendance(doc as unknown as Record<string, unknown>))
    .filter((row) => Number(row.clockInTimestamp || 0) >= cutoff)
    .map((row) => {
      const employee = employeeById.get(row.employeeId);
      const site = row.siteId ? siteById.get(row.siteId) : undefined;
      return {
        attendanceId: row.id,
        employeeId: row.employeeId,
        employeeName: employee?.name || row.employeeName || 'Employee',
        employeeCode: employee?.employeeCode || row.employeeCode || '',
        siteId: row.siteId,
        siteName: site?.name || row.locationName || 'Unassigned',
        clockInTime: row.clockInTime || '',
        clockInTimestamp: Number(row.clockInTimestamp || 0),
        geofenceStatus: row.geofenceStatus,
        punchInLat: row.punchInLat,
        punchInLong: row.punchInLong,
        locationName: row.locationName,
        status: row.status,
      };
    });

  const bySiteId: Record<string, number> = {};
  let fieldCount = 0;

  for (const row of checkedIn) {
    if (row.siteId && siteById.has(row.siteId)) {
      bySiteId[row.siteId] = (bySiteId[row.siteId] || 0) + 1;
    } else {
      fieldCount += 1;
    }
  }

  return {
    checkedIn,
    bySiteId,
    fieldCount,
    totalCheckedIn: checkedIn.length,
    fetchedAt: new Date().toISOString(),
  };
}

export async function upsertSiteAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = siteSchema.safeParse({
    siteId: formData.get('siteId') || undefined,
    name: formData.get('name'),
    lat: formData.get('lat'),
    long: formData.get('long'),
    radiusMeters: formData.get('radiusMeters') || 500,
    address: formData.get('address') || '',
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    name: data.name,
    lat: data.lat,
    long: data.long,
    radiusMeters: data.radiusMeters,
    address: data.address || '',
    status: data.status,
  };
  try {
    if (data.siteId) {
      const existing = mapSite(
        (await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.sitesCollectionId,
          data.siteId,
        )) as unknown as Record<string, unknown>,
      );
      if (existing.companyId !== ctx.company.id) {
        return { ok: false as const, error: 'Site not found.' };
      }
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.sitesCollectionId,
        data.siteId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.sitesCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save site.') };
  }
}

export async function deactivateSiteAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const siteId = String(formData.get('siteId') || '');
  if (!siteId) {
    return { ok: false as const, error: 'Site id is required.' };
  }

  try {
    const { databases } = createAdminClient();
    const existing = mapSite(
      (await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.sitesCollectionId,
        siteId,
      )) as unknown as Record<string, unknown>,
    );
    if (existing.companyId !== ctx.company.id) {
      return { ok: false as const, error: 'Site not found.' };
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.sitesCollectionId,
      siteId,
      { status: 'inactive' },
    );
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'site.deactivated',
      entityType: 'site',
      entityId: siteId,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to deactivate site.') };
  }
}

export async function deleteSiteAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const siteId = String(formData.get('siteId') || '');
  if (!siteId) {
    return { ok: false as const, error: 'Site id is required.' };
  }

  try {
    const { databases } = createAdminClient();
    const existing = mapSite(
      (await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.sitesCollectionId,
        siteId,
      )) as unknown as Record<string, unknown>,
    );
    if (existing.companyId !== ctx.company.id) {
      return { ok: false as const, error: 'Site not found.' };
    }

    const assigned = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('primarySiteId', siteId),
        Query.limit(1),
      ],
    );
    if (assigned.total > 0) {
      return {
        ok: false as const,
        error: 'Site is assigned to employees. Reassign them or deactivate the site instead.',
      };
    }

    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.sitesCollectionId,
      siteId,
    );
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'site.deleted',
      entityType: 'site',
      entityId: siteId,
      meta: { name: existing.name },
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to delete site.') };
  }
}

// ——— Attendance ———

async function fetchAttendanceRows(
  params: AttendanceQueryParams | undefined,
  options: { paginate: boolean },
): Promise<AttendanceListResult> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(
    options.paginate ? ATTENDANCE_PAGE_SIZE : params?.pageSize ?? ATTENDANCE_EXPORT_MAX,
    ATTENDANCE_EXPORT_MAX,
  );
  const offset = options.paginate ? (page - 1) * pageSize : 0;

  const queries = [
    Query.equal('companyId', ctx.company.id),
    Query.orderDesc('dateIso'),
    Query.limit(pageSize),
  ];
  if (options.paginate) {
    queries.push(Query.offset(offset));
  }
  if (params?.userId) queries.push(Query.equal('userId', params.userId));
  if (params?.status) queries.push(Query.equal('status', params.status));
  if (params?.siteId) queries.push(Query.equal('siteId', params.siteId));
  if (params?.geofenceStatus) {
    queries.push(Query.equal('geofenceStatus', params.geofenceStatus));
  }
  if (params?.openShiftsOnly) {
    queries.push(Query.isNull('clockOutTime'));
    queries.push(Query.isNotNull('clockInTime'));
  }
  if (params?.dateFrom && params?.dateTo) {
    queries.push(Query.greaterThanEqual('dateIso', params.dateFrom));
    queries.push(Query.lessThanEqual('dateIso', params.dateTo));
  } else if (params?.dateFrom) {
    queries.push(Query.greaterThanEqual('dateIso', params.dateFrom));
  } else if (params?.dateTo) {
    queries.push(Query.lessThanEqual('dateIso', params.dateTo));
  } else if (params?.month) {
    queries.push(Query.startsWith('dateIso', params.month));
  }

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    queries,
  );
  const employees = await listEmployeesAction();
  const byId = new Map(employees.employees.map((e) => [e.id, e]));
  let rows = result.documents.map((d) => {
    const row = mapAttendance(d as unknown as Record<string, unknown>);
    const emp = byId.get(row.employeeId);
    return {
      ...row,
      employeeName: emp?.name,
      employeeCode: emp?.employeeCode,
    };
  });

  return {
    rows,
    total: result.total,
    page,
    pageSize,
  };
}

export async function listAttendanceAction(
  params?: AttendanceQueryParams,
): Promise<AttendanceListResult> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? ATTENDANCE_PAGE_SIZE;
  return fetchAttendanceRows({ ...params, page, pageSize }, { paginate: true });
}

export async function exportAttendanceCsvAction(params: AttendanceQueryParams) {
  await requireCompanyAdmin();
  const { rows } = await fetchAttendanceRows(
    { ...params, page: 1, pageSize: ATTENDANCE_EXPORT_MAX },
    { paginate: false },
  );
  if (rows.length === 0) {
    return { ok: false as const, error: 'No rows to export for these filters.' };
  }
  return { ok: true as const, csv: attendanceRowsToCsv(rows), rowCount: rows.length };
}

async function fetchAllActiveEmployees(companyId: string) {
  const { databases } = createAdminClient();
  const employees: EmployeeMembership[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.equal('status', 'active'),
        Query.orderAsc('employeeCode'),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );
    employees.push(
      ...result.documents.map((doc) =>
        mapEmployee(doc as unknown as Record<string, unknown>),
      ),
    );
    if (result.documents.length < limit) break;
    offset += limit;
    if (offset >= REGISTER_EXPORT_MAX) break;
  }

  return employees;
}

async function fetchMonthAttendanceStatusMap(companyId: string, month: string) {
  const { databases } = createAdminClient();
  const attendanceByEmployeeDate = new Map<string, RegisterDayFact[]>();
  let offset = 0;
  const limit = 500;

  while (true) {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.startsWith('dateIso', month),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    for (const doc of result.documents) {
      const row = mapAttendance(doc as unknown as Record<string, unknown>);
      const key = `${row.employeeId}:${row.dateIso}`;
      const list = attendanceByEmployeeDate.get(key) || [];
      list.push({ status: row.status, earlyDeparture: row.earlyDeparture });
      attendanceByEmployeeDate.set(key, list);
    }

    if (result.documents.length < limit) break;
    offset += limit;
    if (offset >= ATTENDANCE_EXPORT_MAX) break;
  }

  return attendanceByEmployeeDate;
}

async function fetchMonthHolidayDates(companyId: string, month: string) {
  const { daysInMonth, monthDays } = getMonthDays(month);
  const monthStart = monthDays[0]!;
  const monthEnd = monthDays[daysInMonth - 1]!;
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.holidaysCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.greaterThanEqual('date', monthStart),
      Query.lessThanEqual('date', monthEnd),
      Query.limit(100),
    ],
  );

  return new Set(
    result.documents.map((doc) => String((doc as { date?: string }).date || '')),
  );
}

async function buildAttendanceRegister(
  filters: AttendanceRegisterFilters,
  options: { paginate: boolean },
): Promise<AttendanceRegisterResult> {
  const ctx = await requireCompanyAdmin();
  const month = /^\d{4}-\d{2}$/.test(filters.month) ? filters.month : currentRegisterMonth();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(
    options.paginate ? 100 : REGISTER_EXPORT_MAX,
    filters.pageSize ?? REGISTER_PAGE_SIZE,
  );
  const sort = filters.sort === 'name' ? 'name' : 'code';
  const { daysInMonth, monthDays } = getMonthDays(month);

  const [employees, sites, attendanceByEmployeeDate, holidayDates] = await Promise.all([
    fetchAllActiveEmployees(ctx.company.id),
    listSitesAction(),
    fetchMonthAttendanceStatusMap(ctx.company.id, month),
    fetchMonthHolidayDates(ctx.company.id, month),
  ]);

  const siteNameById = new Map(sites.map((site) => [site.id, site.name]));
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  const designations = [...new Set(employees.map((e) => e.designation).filter(Boolean))].sort();
  const branches = sites
    .filter((site) => site.status === 'active')
    .map((site) => ({ id: site.id, name: site.name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const filtered = sortRegisterEmployees(
    filterRegisterEmployees(employees, filters, siteNameById),
    sort,
  );
  const total = filtered.length;
  const slice = options.paginate
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : filtered.slice(0, REGISTER_EXPORT_MAX);

  const rows = buildRegisterRows(
    slice,
    month,
    ctx.company.settings.workWeek,
    holidayDates,
    attendanceByEmployeeDate,
    siteNameById,
  );

  return {
    month,
    daysInMonth,
    monthDays,
    rows,
    total,
    page,
    pageSize,
    departments,
    designations,
    branches,
  };
}

export async function getAttendanceRegisterAction(
  filters: AttendanceRegisterFilters,
): Promise<AttendanceRegisterResult> {
  return buildAttendanceRegister(filters, { paginate: true });
}

export async function exportAttendanceRegisterCsvAction(filters: AttendanceRegisterFilters) {
  await requireCompanyAdmin();
  const register = await buildAttendanceRegister(filters, { paginate: false });
  if (register.rows.length === 0) {
    return { ok: false as const, error: 'No employees match these filters for export.' };
  }
  return {
    ok: true as const,
    csv: registerRowsToCsv(register.rows, register.month, register.daysInMonth),
    rowCount: register.rows.length,
    month: register.month,
  };
}

export async function getDashboardStatsAction(): Promise<DashboardSnapshot> {
  const ctx = await requireTenantMember();
  const isAdmin = isCompanyAdminRole(ctx.membership.role);
  const { databases } = createAdminClient();
  const tz = ctx.company.settings.timezone || 'Asia/Kolkata';
  const { dateIso: today } = dateIsoInTimeZone(Date.now(), tz);
  const yesterday = addDaysIso(today, -1);

  const [
    activeEmpCount,
    inactiveEmpCount,
    invitedEmpCount,
    empDocs,
    attendance,
    overnightOpen,
    recentDocs,
    pendingLeaveDocs,
    approvedLeaveDocs,
    pendingRegDocs,
  ] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.equal('status', 'active'), Query.limit(1)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.equal('status', 'inactive'), Query.limit(1)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.equal('status', 'invited'), Query.limit(1)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.limit(500)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('dateIso', today),
        Query.limit(500),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('dateIso', yesterday),
        Query.isNull('clockOutTime'),
        Query.limit(200),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.orderDesc('clockInTimestamp'),
        Query.limit(12),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('status', 'pending'),
        Query.orderDesc('$createdAt'),
        Query.limit(8),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('status', 'approved'),
        Query.lessThanEqual('fromDate', today),
        Query.limit(200),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.regularizationsCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('status', 'pending'),
        Query.orderDesc('$createdAt'),
        Query.limit(isAdmin ? 6 : 1),
      ],
    ),
  ]);

  const byId = new Map(
    empDocs.documents.map((d) => {
      const e = mapEmployee(d as unknown as Record<string, unknown>);
      return [e.id, e] as const;
    }),
  );

  const byType: Record<string, number> = {};
  for (const doc of empDocs.documents) {
    const e = mapEmployee(doc as unknown as Record<string, unknown>);
    if (e.status !== 'active') continue;
    const key = e.employmentType || 'Other';
    byType[key] = (byType[key] || 0) + 1;
  }

  const rows = attendance.documents.map((d) =>
    mapAttendance(d as unknown as Record<string, unknown>),
  );
  const openOvernight = overnightOpen.documents
    .map((d) => mapAttendance(d as unknown as Record<string, unknown>))
    .filter((r) => r.clockInTime && !r.clockOutTime);

  const present = rows.filter((r) => r.status === 'PRESENT').length;
  const late = rows.filter((r) => r.status === 'LATE').length;
  const absent = rows.filter((r) => r.status === 'ABSENT').length;
  const onLeave = rows.filter(
    (r) => r.status === 'ON_LEAVE' || r.status === 'LEAVE_PENDING',
  ).length;
  const halfDay = rows.filter((r) => r.status === 'HALF_DAY').length;
  const markedEmployeeIds = new Set(rows.map((r) => r.employeeId));
  const openToday = rows.filter((r) => r.clockInTime && !r.clockOutTime);
  const openShifts = openToday.length + openOvernight.length;

  const leaveTypes = await listLeaveTypesAction();
  const typeById = new Map(leaveTypes.map((t) => [t.id, t.name]));

  const pendingItems = pendingLeaveDocs.documents.map((d) => {
    const row = mapLeaveRequest(d as unknown as Record<string, unknown>);
    return {
      id: row.id,
      employeeName: byId.get(row.employeeId)?.name || 'Employee',
      leaveTypeName: typeById.get(row.leaveTypeId) || 'Leave',
      fromDate: row.fromDate,
      toDate: row.toDate,
      days: row.days,
      status: row.status,
    };
  });

  const onLeaveTodayItems = approvedLeaveDocs.documents
    .map((d) => mapLeaveRequest(d as unknown as Record<string, unknown>))
    .filter((row) => row.toDate >= today)
    .map((row) => ({
      id: row.id,
      employeeName: byId.get(row.employeeId)?.name || 'Employee',
      leaveTypeName: typeById.get(row.leaveTypeId) || 'Leave',
      fromDate: row.fromDate,
      toDate: row.toDate,
      days: row.days,
      status: row.status,
    }))
    .slice(0, 8);

  const onDutyNow = [...openToday, ...openOvernight]
    .sort((a, b) => Number(b.clockInTimestamp || 0) - Number(a.clockInTimestamp || 0))
    .slice(0, 10)
    .map((row) => ({
      employeeId: row.employeeId,
      employeeName: byId.get(row.employeeId)?.name || row.employeeName || 'Employee',
      clockInTime: row.clockInTime || '',
      siteName: row.locationName || '—',
      status: row.status,
      geofenceStatus: row.geofenceStatus,
    }));

  const recent = recentDocs.documents.map((d) => {
    const row = mapAttendance(d as unknown as Record<string, unknown>);
    return {
      ...row,
      employeeName: byId.get(row.employeeId)?.name || row.userId,
    };
  });

  const active = activeEmpCount.total;

  let adminQueues: DashboardSnapshot['adminQueues'] = null;
  if (isAdmin) {
    const regularizationItems = pendingRegDocs.documents.map((d) => {
      const row = mapRegularization(d as unknown as Record<string, unknown>);
      return {
        id: row.id,
        employeeName: byId.get(row.employeeId)?.name || 'Employee',
        dateIso: row.dateIso,
        requestedClockIn: row.requestedClockIn,
        requestedClockOut: row.requestedClockOut,
        requestedOutDateIso: row.requestedOutDateIso,
        reason: row.reason,
      };
    });

    const shiftRows = await listPendingShiftChangeRequests(ctx.company.id);
    const shifts = await listShiftsAction();
    const enrichedShifts = await enrichShiftChangeRequests(
      ctx.company.id,
      shiftRows.slice(0, 6),
      empDocs.documents.map((d) => {
        const e = mapEmployee(d as unknown as Record<string, unknown>);
        return { id: e.id, name: e.name };
      }),
      shifts,
    );

    adminQueues = {
      regularizationsPending: pendingRegDocs.total,
      regularizationItems,
      shiftChangesPending: shiftRows.length,
      shiftChangeItems: enrichedShifts.map((row) => ({
        id: row.id,
        employeeName: row.employeeName || row.employeeId,
        dateIso: row.dateIso,
        sequence: row.sequence,
        currentShiftLabel: row.currentShiftName
          ? `${row.currentShiftName}${row.currentShiftCode ? ` (${row.currentShiftCode})` : ''}`
          : 'Default / unassigned',
        requestedShiftLabel: row.requestedShiftName
          ? `${row.requestedShiftName}${row.requestedShiftCode ? ` (${row.requestedShiftCode})` : ''}`
          : row.requestedShiftId,
        reason: row.reason,
      })),
    };
  }

  return {
    today,
    employees: {
      active,
      inactive: inactiveEmpCount.total,
      invited: invitedEmpCount.total,
      byType,
    },
    attendance: {
      present,
      late,
      absent,
      onLeave,
      halfDay,
      openShifts,
      marked: markedEmployeeIds.size,
      unmarked: Math.max(0, active - markedEmployeeIds.size),
    },
    leave: {
      pending: pendingLeaveDocs.total,
      onLeaveToday: onLeaveTodayItems.length,
      pendingItems,
      onLeaveTodayItems,
    },
    regularizationsPending: pendingRegDocs.total,
    adminQueues,
    onDutyNow,
    recent,
  };
}

export async function listRegularizationsAction(): Promise<AttendanceRegularization[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.regularizationsCollectionId,
    [
      Query.equal('companyId', ctx.company.id),
      Query.equal('status', 'pending'),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ],
  );
  const employees = await listEmployeesAction();
  const byId = new Map(employees.employees.map((e) => [e.id, e]));
  return result.documents.map((d) => {
    const row = mapRegularization(d as unknown as Record<string, unknown>);
    return { ...row, employeeName: byId.get(row.employeeId)?.name };
  });
}

export async function reviewRegularizationAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = reviewRegularizationSchema.safeParse({
    regularizationId: formData.get('regularizationId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.regularizationsCollectionId,
      parsed.data.regularizationId,
    );
    const reg = mapRegularization(doc as unknown as Record<string, unknown>);
    if (reg.companyId !== ctx.company.id) {
      return { ok: false as const, error: 'Not found.' };
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.regularizationsCollectionId,
      reg.id,
      {
        status: parsed.data.decision,
        approverUserId: ctx.user.$id,
        reviewNote: parsed.data.reviewNote || '',
      },
    );

    if (parsed.data.decision === 'approved') {
      const tz = ctx.company.settings.timezone || 'Asia/Kolkata';
      const existing = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        [
          Query.equal('companyId', ctx.company.id),
          Query.equal('employeeId', reg.employeeId),
          Query.equal('dateIso', reg.dateIso),
          Query.limit(1),
        ],
      );
      const outDateIso = reg.requestedOutDateIso || reg.dateIso;
      const isOvernight = Boolean(
        reg.requestedClockOut && outDateIso && outDateIso !== reg.dateIso,
      );

      let clockInTimestamp: number | undefined;
      let clockOutTimestamp: number | undefined;
      if (reg.requestedClockIn) {
        clockInTimestamp = zonedDateTimeToUtcMs(reg.dateIso, reg.requestedClockIn, tz);
      }
      if (reg.requestedClockOut) {
        clockOutTimestamp = zonedDateTimeToUtcMs(outDateIso, reg.requestedClockOut, tz);
      }

      const payload: Record<string, unknown> = {
        companyId: ctx.company.id,
        employeeId: reg.employeeId,
        userId: reg.userId,
        dateIso: reg.dateIso,
        dayOfWeek: '',
        formattedDate: reg.dateIso,
        status: 'PRESENT',
        note: `Regularized: ${reg.reason}`,
        geofenceStatus: 'UNKNOWN',
        distanceMeters: 0,
        locationName: 'Regularization',
        siteId: '',
        deviceId: '',
        isOvernight,
        earlyDeparture: false,
        overtimeMinutes: 0,
      };
      if (reg.requestedClockIn) {
        payload.clockInTime = reg.requestedClockIn;
        payload.clockInTimestamp = clockInTimestamp;
      }
      if (reg.requestedClockOut) {
        payload.clockOutTime = reg.requestedClockOut;
        payload.clockOutTimestamp = clockOutTimestamp;
        if (clockInTimestamp && clockOutTimestamp) {
          payload.totalMinutes = Math.max(
            0,
            Math.round((clockOutTimestamp - clockInTimestamp) / 60_000),
          );
        }
      }

      // Recompute early/OT when employee shift is known.
      try {
        const empDoc = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.employeesCollectionId,
          reg.employeeId,
        );
        const employee = mapEmployee(empDoc as unknown as Record<string, unknown>);
        let shift: WorkShift | null = null;
        if (employee.shiftId) {
          try {
            shift = mapWorkShift(
              (await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.shiftsCollectionId,
                employee.shiftId,
              )) as unknown as Record<string, unknown>,
            );
          } catch {
            shift = null;
          }
        }
        if (shift && clockInTimestamp && clockOutTimestamp) {
          const occurrence = resolvePunchOutOccurrence(shift, reg.dateIso, tz);
          const finalized = finalizeAttendanceOnPunchOut({
            punchInStatus: 'PRESENT',
            clockInTimestamp,
            clockOutTimestamp,
            occurrence,
          });
          payload.status = finalized.status;
          payload.earlyDeparture = finalized.earlyDeparture;
          payload.overtimeMinutes = finalized.overtimeMinutes;
          payload.totalMinutes = finalized.totalMinutes;
          payload.scheduledStartTimestamp = occurrence.scheduledStartMs;
          payload.scheduledEndTimestamp = occurrence.scheduledEndMs;
          payload.shiftId = shift.id;
          payload.isOvernight = occurrence.isOvernight || isOvernight;
        }
      } catch {
        /* keep PRESENT defaults */
      }

      if (existing.total > 0) {
        const attendanceId = existing.documents[0].$id;
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.attendanceCollectionId,
          attendanceId,
          payload,
        );
        if (payload.clockOutTimestamp) {
          await closeOpenSegmentsForRegularization(databases, {
            companyId: ctx.company.id,
            employeeId: reg.employeeId,
            attendanceId,
            dateIso: reg.dateIso,
            clockOutTime:
              typeof payload.clockOutTime === 'string' ? payload.clockOutTime : reg.requestedClockOut,
            clockOutTimestamp: Number(payload.clockOutTimestamp),
          });
        }
      } else {
        const created = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.attendanceCollectionId,
          ID.unique(),
          payload,
          employeeDocumentPermissions(ctx.company.teamId),
        );
        if (payload.clockOutTimestamp) {
          await closeOpenSegmentsForRegularization(databases, {
            companyId: ctx.company.id,
            employeeId: reg.employeeId,
            attendanceId: created.$id,
            dateIso: reg.dateIso,
            clockOutTime:
              typeof payload.clockOutTime === 'string' ? payload.clockOutTime : reg.requestedClockOut,
            clockOutTimestamp: Number(payload.clockOutTimestamp),
          });
        }
      }
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to review request.') };
  }
}

export async function submitRegularizationAction(formData: FormData) {
  const ctx = await requireTenantMember();
  const parsed = regularizationSchema.safeParse({
    dateIso: formData.get('dateIso'),
    reason: formData.get('reason'),
    requestedClockIn: formData.get('requestedClockIn') || '',
    requestedClockOut: formData.get('requestedClockOut') || '',
    requestedOutDateIso: formData.get('requestedOutDateIso') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  try {
    const { databases } = createAdminClient();
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.regularizationsCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        employeeId: ctx.membership.id,
        userId: ctx.user.$id,
        dateIso: parsed.data.dateIso,
        reason: parsed.data.reason,
        requestedClockIn: parsed.data.requestedClockIn || '',
        requestedClockOut: parsed.data.requestedClockOut || '',
        requestedOutDateIso: parsed.data.requestedOutDateIso || '',
        status: 'pending',
        approverUserId: '',
        reviewNote: '',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to submit request.') };
  }
}

// ——— Leave ———

export async function listThreePlVendorsAction(): Promise<ThreePlVendor[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.threePlVendorsCollectionId,
    [Query.equal('companyId', ctx.company.id), Query.orderAsc('name'), Query.limit(100)],
  );
  return result.documents.map((doc) => mapThreePlVendor(doc as unknown as Record<string, unknown>));
}

export async function upsertThreePlVendorAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = threePlVendorSchema.safeParse({
    vendorId: formData.get('vendorId') || undefined,
    name: formData.get('name'),
    contactName: formData.get('contactName') || '',
    contactEmail: formData.get('contactEmail') || '',
    contactPhone: formData.get('contactPhone') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    name: data.name,
    contactName: data.contactName || '',
    contactEmail: data.contactEmail || '',
    contactPhone: data.contactPhone || '',
    status: 'active',
  };

  try {
    if (data.vendorId) {
      const existing = await getActiveThreePlVendor(ctx.company.id, data.vendorId);
      if (!existing) {
        return { ok: false as const, error: '3PL provider not found.' };
      }
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threePlVendorsCollectionId,
        data.vendorId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threePlVendorsCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save 3PL provider.') };
  }
}

export async function deactivateThreePlVendorAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const vendorId = String(formData.get('vendorId') || '');
  if (!vendorId) {
    return { ok: false as const, error: 'Provider id is required.' };
  }

  try {
    const vendor = await getActiveThreePlVendor(ctx.company.id, vendorId);
    if (!vendor) {
      return { ok: false as const, error: '3PL provider not found.' };
    }
    const { databases } = createAdminClient();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.threePlVendorsCollectionId,
      vendorId,
      { status: 'inactive' },
    );
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to deactivate provider.') };
  }
}

export async function listLeaveTypesAction(): Promise<LeaveType[]> {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.leaveTypesCollectionId,
    [Query.equal('companyId', ctx.company.id), Query.limit(50)],
  );
  return result.documents.map((d) => mapLeaveType(d as unknown as Record<string, unknown>));
}

export async function upsertLeaveTypeAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = leaveTypeSchema.safeParse({
    leaveTypeId: formData.get('leaveTypeId') || undefined,
    name: formData.get('name'),
    code: formData.get('code'),
    paid: formData.get('paid') === 'on' || formData.get('paid') === 'true',
    accrualPerMonth: formData.get('accrualPerMonth') || 1,
    maxBalance: formData.get('maxBalance') || 24,
    carryForward: formData.get('carryForward') === 'on' || formData.get('carryForward') === 'true',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    name: data.name,
    code: data.code,
    paid: data.paid,
    accrualPerMonth: data.accrualPerMonth,
    maxBalance: data.maxBalance,
    carryForward: data.carryForward,
    status: 'active',
  };
  try {
    if (data.leaveTypeId) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.leaveTypesCollectionId,
        data.leaveTypeId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.leaveTypesCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save leave type.') };
  }
}

export async function listHolidaysAction(): Promise<Holiday[]> {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.holidaysCollectionId,
    [Query.equal('companyId', ctx.company.id), Query.orderAsc('date'), Query.limit(200)],
  );
  return result.documents.map((d) => mapHoliday(d as unknown as Record<string, unknown>));
}

export async function upsertHolidayAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = holidaySchema.safeParse({
    holidayId: formData.get('holidayId') || undefined,
    date: formData.get('date'),
    name: formData.get('name'),
    region: formData.get('region') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const { databases } = createAdminClient();
  const payload = {
    companyId: ctx.company.id,
    date: data.date,
    name: data.name,
    region: data.region || '',
  };
  try {
    if (data.holidayId) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.holidaysCollectionId,
        data.holidayId,
        payload,
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.holidaysCollectionId,
        ID.unique(),
        payload,
        employeeDocumentPermissions(ctx.company.teamId),
      );
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save holiday.') };
  }
}

export async function listMyLeaveBalancesAction(): Promise<LeaveBalance[]> {
  const ctx = await requireTenantMember();
  const year = new Date().getFullYear();
  const types = await listLeaveTypesAction();
  const balances: LeaveBalance[] = [];
  for (const t of types.filter((x) => x.status === 'active')) {
    balances.push(
      await ensureLeaveBalance(
        ctx.company.id,
        ctx.company.teamId,
        ctx.membership.id,
        t.id,
        year,
        t.accrualPerMonth * 12,
      ),
    );
  }
  return balances;
}

export async function applyLeaveAction(formData: FormData) {
  const ctx = await requireTenantMember();
  const parsed = leaveRequestSchema.safeParse({
    leaveTypeId: formData.get('leaveTypeId'),
    fromDate: formData.get('fromDate'),
    toDate: formData.get('toDate'),
    note: formData.get('note') || '',
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  try {
    const validation = await validateLeaveApplication({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      employeeId: ctx.membership.id,
      leaveTypeId: parsed.data.leaveTypeId,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
    });
    if (!validation.ok) {
      return { ok: false as const, error: validation.error };
    }

    const { databases } = createAdminClient();
    const created = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        employeeId: ctx.membership.id,
        userId: ctx.user.$id,
        leaveTypeId: parsed.data.leaveTypeId,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        days: validation.days,
        status: 'pending',
        approverUserId: '',
        note: parsed.data.note || '',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );
    const req = mapLeaveRequest(created as unknown as Record<string, unknown>);
    const leaveTypeName = await getLeaveTypeName(ctx.company.id, parsed.data.leaveTypeId);
    await syncLeaveRequestToAttendance({
      company: ctx.company,
      teamId: ctx.company.teamId,
      request: req,
      leaveTypeName,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to apply leave.') };
  }
}

export async function listLeaveRequestsAction(status?: string): Promise<LeaveRequest[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const queries = [
    Query.equal('companyId', ctx.company.id),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ];
  if (status) queries.push(Query.equal('status', status));
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.leaveRequestsCollectionId,
    queries,
  );
  const [employees, types] = await Promise.all([listEmployeesAction(), listLeaveTypesAction()]);
  const empById = new Map(employees.employees.map((e) => [e.id, e]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  return result.documents.map((d) => {
    const row = mapLeaveRequest(d as unknown as Record<string, unknown>);
    return {
      ...row,
      employeeName: empById.get(row.employeeId)?.name,
      leaveTypeName: typeById.get(row.leaveTypeId)?.name,
    };
  });
}

export async function reviewLeaveAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = reviewLeaveSchema.safeParse({
    leaveRequestId: formData.get('leaveRequestId'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      parsed.data.leaveRequestId,
    );
    const req = mapLeaveRequest(doc as unknown as Record<string, unknown>);
    if (req.companyId !== ctx.company.id || req.status !== 'pending') {
      return { ok: false as const, error: 'Request not reviewable.' };
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      req.id,
      { status: parsed.data.decision, approverUserId: ctx.user.$id },
    );

    const updatedReq: LeaveRequest = {
      ...req,
      status: parsed.data.decision,
      approverUserId: ctx.user.$id,
    };

    if (parsed.data.decision === 'approved') {
      const year = Number(req.fromDate.slice(0, 4));
      const balance = await ensureLeaveBalance(
        ctx.company.id,
        ctx.company.teamId,
        req.employeeId,
        req.leaveTypeId,
        year,
      );
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.leaveBalancesCollectionId,
        balance.id,
        { balance: Math.max(0, balance.balance - req.days) },
      );
    }

    const leaveTypeName = await getLeaveTypeName(ctx.company.id, req.leaveTypeId);
    await syncLeaveRequestToAttendance({
      company: ctx.company,
      teamId: ctx.company.teamId,
      request: updatedReq,
      leaveTypeName,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to review leave.') };
  }
}

export async function assignLeaveBalanceAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = leaveBalanceAssignSchema.safeParse({
    employeeId: formData.get('employeeId'),
    leaveTypeId: formData.get('leaveTypeId'),
    year: formData.get('year') || new Date().getFullYear(),
    balance: formData.get('balance'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  try {
    const employee = await getEmployeeAction(parsed.data.employeeId);
    if (employee.companyId !== ctx.company.id) {
      return { ok: false as const, error: 'Employee not in this company.' };
    }
    await assignLeaveBalance({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      employeeId: parsed.data.employeeId,
      leaveTypeId: parsed.data.leaveTypeId,
      year: parsed.data.year,
      balance: parsed.data.balance,
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to assign leave balance.') };
  }
}

export async function listLeaveAssignmentsAction(year?: number) {
  const ctx = await requireCompanyAdmin();
  const y = year ?? new Date().getFullYear();
  return listCompanyLeaveBalances(ctx.company.id, y);
}

// ——— Payroll ———

export async function upsertSalaryStructureAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = salaryStructureSchema.safeParse({
    employeeId: formData.get('employeeId'),
    effectiveFrom: formData.get('effectiveFrom'),
    basic: formData.get('basic') ?? 0,
    hra: formData.get('hra') ?? 0,
    specialAllowance: formData.get('specialAllowance') ?? 0,
    otherEarnings: formData.get('otherEarnings') ?? 0,
    deductions: formData.get('deductions') ?? 0,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }
  const data = parsed.data;
  const amounts = {
    basic: data.basic,
    hra: data.hra,
    specialAllowance: data.specialAllowance,
    otherEarnings: data.otherEarnings,
    deductions: data.deductions,
  };
  const components = buildSalaryComponents(amounts);
  const ctcMonthly = computeCtcMonthly(amounts);

  try {
    await getEmployeeAction(data.employeeId);
    const { databases } = createAdminClient();
    // deactivate previous
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.salaryStructuresCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('employeeId', data.employeeId),
        Query.equal('status', 'active'),
        Query.limit(20),
      ],
    );
    for (const doc of existing.documents) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.salaryStructuresCollectionId,
        doc.$id,
        { status: 'inactive' },
      );
    }
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.salaryStructuresCollectionId,
      ID.unique(),
      {
        companyId: ctx.company.id,
        employeeId: data.employeeId,
        effectiveFrom: data.effectiveFrom,
        components: JSON.stringify(components),
        ctcMonthly,
        status: 'active',
      },
      employeeDocumentPermissions(ctx.company.teamId),
    );
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save salary structure.') };
  }
}

export async function getSalaryStructureAction(
  employeeId: string,
): Promise<SalaryStructure | null> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.salaryStructuresCollectionId,
    [
      Query.equal('companyId', ctx.company.id),
      Query.equal('employeeId', employeeId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ],
  );
  if (result.total === 0) return null;
  return mapSalaryStructure(result.documents[0] as unknown as Record<string, unknown>);
}

export async function runPayrollAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const parsed = payrollRunSchema.safeParse({ month: formData.get('month') });
  if (!parsed.success) {
    return { ok: false as const, error: 'Month must be YYYY-MM.' };
  }
  const month = parsed.data.month;

  try {
    const { databases } = createAdminClient();
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.payrollRunsCollectionId,
      [Query.equal('companyId', ctx.company.id), Query.equal('month', month), Query.limit(1)],
    );
    if (existing.total > 0 && existing.documents[0].status === 'finalized') {
      return { ok: false as const, error: 'Payroll for this month is already finalized.' };
    }

    const employees = (await listEmployeesAction()).employees.filter(
      (e) => e.status === 'active' && (e.employmentType === 'Permanent' || !e.employmentType),
    );
    const attendance = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.startsWith('dateIso', month),
        Query.limit(5000),
      ],
    );
    const leave = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      [
        Query.equal('companyId', ctx.company.id),
        Query.equal('status', 'approved'),
        Query.limit(2000),
      ],
    );

    const workingDays = 22; // simple MVP assumption
    let runId = existing.total > 0 ? existing.documents[0].$id : '';
    if (!runId) {
      const run = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.payrollRunsCollectionId,
        ID.unique(),
        {
          companyId: ctx.company.id,
          month,
          status: 'draft',
          totals: JSON.stringify({}),
          notes: '',
        },
        employeeDocumentPermissions(ctx.company.teamId),
      );
      runId = run.$id;
    } else {
      // clear old payslips for draft re-run
      const oldSlips = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.payslipsCollectionId,
        [Query.equal('payrollRunId', runId), Query.limit(500)],
      );
      for (const slip of oldSlips.documents) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.payslipsCollectionId,
          slip.$id,
        );
      }
    }

    let totalNet = 0;
    let count = 0;
    for (const emp of employees) {
      const structureResult = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.salaryStructuresCollectionId,
        [
          Query.equal('companyId', ctx.company.id),
          Query.equal('employeeId', emp.id),
          Query.equal('status', 'active'),
          Query.limit(1),
        ],
      );
      if (structureResult.total === 0) continue;
      const structure = mapSalaryStructure(
        structureResult.documents[0] as unknown as Record<string, unknown>,
      );

      const presentDays = attendance.documents.filter(
        (d) =>
          d.employeeId === emp.id &&
          (d.status === 'PRESENT' || d.status === 'LATE' || d.status === 'HALF_DAY'),
      ).length;
      const leaveDays = leave.documents
        .filter(
          (d) =>
            d.employeeId === emp.id && String(d.fromDate || '').startsWith(month),
        )
        .reduce((sum, d) => sum + Number(d.days || 0), 0);
      const payableDays = Math.min(workingDays, presentDays + leaveDays);
      const ratio = workingDays > 0 ? payableDays / workingDays : 0;
      const earnings = structure.components
        .filter((c) => c.type === 'earning')
        .reduce((s, c) => s + c.amount, 0);
      const deductions = structure.components
        .filter((c) => c.type === 'deduction')
        .reduce((s, c) => s + c.amount, 0);
      const gross = earnings * ratio;
      const netPay = Math.max(0, gross - deductions * ratio);
      const breakdown = {
        payableDays,
        workingDays,
        presentDays,
        leaveDays,
        components: structure.components,
        gross,
        deductions: deductions * ratio,
        netPay,
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.payslipsCollectionId,
        ID.unique(),
        {
          companyId: ctx.company.id,
          payrollRunId: runId,
          employeeId: emp.id,
          breakdown: JSON.stringify(breakdown),
          fileId: '',
          netPay,
          month,
        },
        employeeDocumentPermissions(ctx.company.teamId),
      );
      totalNet += netPay;
      count += 1;
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.payrollRunsCollectionId,
      runId,
      {
        status: 'finalized',
        totals: JSON.stringify({ employees: count, totalNet, workingDays }),
      },
    );

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'payroll.finalized',
      entityType: 'payroll_run',
      entityId: runId,
      meta: { month, count, totalNet },
    });

    return { ok: true as const, payrollRunId: runId };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Payroll run failed.') };
  }
}

export async function listPayrollRunsAction(): Promise<PayrollRun[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.payrollRunsCollectionId,
    [Query.equal('companyId', ctx.company.id), Query.orderDesc('month'), Query.limit(24)],
  );
  return result.documents.map((d) => mapPayrollRun(d as unknown as Record<string, unknown>));
}

export async function listPayslipsForRunAction(payrollRunId: string): Promise<Payslip[]> {
  const ctx = await requireCompanyAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.payslipsCollectionId,
    [Query.equal('payrollRunId', payrollRunId), Query.limit(500)],
  );
  const slips = result.documents.map((d) => mapPayslip(d as unknown as Record<string, unknown>));
  if (slips.some((s) => s.companyId !== ctx.company.id)) {
    throw new Error('Forbidden');
  }
  return slips;
}

export async function exportBankCsvAction(payrollRunId: string) {
  const ctx = await requireCompanyAdmin();
  const slips = await listPayslipsForRunAction(payrollRunId);
  const employees = (await listEmployeesAction()).employees;
  const byId = new Map(employees.map((e) => [e.id, e]));
  const lines = [
    'employeeCode,name,bankAccountNumber,bankIfsc,netPay,month',
    ...slips.map((s) => {
      const e = byId.get(s.employeeId);
      return [
        e?.employeeCode || '',
        `"${(e?.name || '').replace(/"/g, '""')}"`,
        e?.bankAccountNumber || '',
        e?.bankIfsc || '',
        s.netPay.toFixed(2),
        s.month,
      ].join(',');
    }),
  ];
  await writeAuditLog({
    companyId: ctx.company.id,
    teamId: ctx.company.teamId,
    actorUserId: ctx.user.$id,
    action: 'payroll.bank_csv_exported',
    entityType: 'payroll_run',
    entityId: payrollRunId,
  });
  return { ok: true as const, csv: lines.join('\n') };
}

export async function listEmployeeDocumentsAction(employeeId: string) {
  const ctx = await requireCompanyAdmin();
  const employee = await getEmployeeAction(employeeId);
  return listEmployeeDocuments(ctx.company.id, employee.id);
}

export async function uploadEmployeeDocumentAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const employeeId = String(formData.get('employeeId') || '');
  const category = String(formData.get('category') || '');
  const title = String(formData.get('title') || '');
  const file = formData.get('file');

  if (!employeeId || !category || !title) {
    return { ok: false as const, error: 'Missing required fields.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: 'File is required.' };
  }

  try {
    const employee = await getEmployeeAction(employeeId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadEmployeeDocument({
      membership: employee,
      company: ctx.company,
      uploadedByUserId: ctx.user.$id,
      category: category as 'profile_picture' | 'identity' | 'compliance' | 'employment',
      title,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });
    if (!result.ok) {
      return result;
    }
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.document_uploaded',
      entityType: 'employee_document',
      entityId: result.document.id,
      meta: { employeeId: employee.id, category },
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to upload document.') };
  }
}

export async function deleteEmployeeDocumentAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();
  const employeeId = String(formData.get('employeeId') || '');
  const documentId = String(formData.get('documentId') || '');
  if (!employeeId || !documentId) {
    return { ok: false as const, error: 'Missing required fields.' };
  }

  try {
    const employee = await getEmployeeAction(employeeId);
    const result = await deleteEmployeeDocument({
      membership: employee,
      company: ctx.company,
      documentId,
      requesterUserId: ctx.user.$id,
      isAdmin: true,
    });
    if (!result.ok) {
      return result;
    }
    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'employee.document_deleted',
      entityType: 'employee_document',
      entityId: documentId,
      meta: { employeeId: employee.id },
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to delete document.') };
  }
}
