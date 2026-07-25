import { z } from 'zod';

const employmentTypeEnum = z.enum(['Permanent', '3PL', 'Intern', 'Consultant']);

function validateOrgConfigValue(
  value: string | undefined,
  allowed: string[],
  field: 'department' | 'designation',
  ctx: z.RefinementCtx,
) {
  const trimmed = value?.trim();
  if (!trimmed || allowed.length === 0) return;
  if (!allowed.includes(trimmed)) {
    ctx.addIssue({
      code: 'custom',
      message: `${field === 'department' ? 'Department' : 'Designation'} must be selected from company settings.`,
      path: [field],
    });
  }
}

function validateVendorForEmploymentType(
  employmentType: z.infer<typeof employmentTypeEnum> | undefined,
  vendorId: string | undefined,
  ctx: z.RefinementCtx,
) {
  if (employmentType === '3PL' && !vendorId?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: '3PL manpower provider is required for 3PL employees.',
      path: ['vendorId'],
    });
  }
}

export const createEmployeeSchema = z
  .object({
    name: z.string().trim().min(2).max(128),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(256),
    employeeCode: z.string().trim().max(64).optional().or(z.literal('')),
    employmentType: employmentTypeEnum.default('Permanent'),
    vendorId: z.string().trim().max(64).optional().or(z.literal('')),
    department: z.string().trim().max(128).optional().or(z.literal('')),
    designation: z.string().trim().max(128).optional().or(z.literal('')),
    phone: z.string().trim().min(5, "Phone is required").max(32),
    primarySiteId: z.string().min(1, "Primary site is required"),
    workShiftStart: z.string().trim().min(1, "Start time is required").default('09:00'),
    workShiftEnd: z.string().trim().min(1, "End time is required").default('18:00'),
    shiftId: z.string().trim().min(1, "Shift is required").max(64),
    role: z.enum(['employee', 'company_admin', 'reporting_manager', 'hr_manager']).default('employee'),
  })
  .superRefine((data, ctx) => {
    validateVendorForEmploymentType(data.employmentType, data.vendorId, ctx);
  });

export const updateEmployeeSchema = z
  .object({
    employeeId: z.string().min(1),
    name: z.string().trim().min(2).max(128),
    employeeCode: z.string().trim().max(64).optional().or(z.literal('')),
    employmentType: employmentTypeEnum.optional(),
    vendorId: z.string().trim().max(64).optional().or(z.literal('')),
    department: z.string().trim().max(128).optional().or(z.literal('')),
    designation: z.string().trim().max(128).optional().or(z.literal('')),
    phone: z.string().trim().max(32).optional().or(z.literal('')),
    dateOfJoining: z.string().optional().or(z.literal('')),
    grade: z.string().optional().or(z.literal('')),
    costCenter: z.string().optional().or(z.literal('')),
    dateOfBirth: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    bloodGroup: z.string().optional().or(z.literal('')),
    currentCity: z.string().optional().or(z.literal('')),
    currentState: z.string().optional().or(z.literal('')),
    currentAddressLine1: z.string().trim().max(256).optional().or(z.literal('')),
    currentAddressLine2: z.string().trim().max(256).optional().or(z.literal('')),
    currentPincode: z.string().trim().max(12).optional().or(z.literal('')),
    emergencyContactName: z.string().optional().or(z.literal('')),
    emergencyContactPhone: z.string().optional().or(z.literal('')),
    panNumber: z.string().optional().or(z.literal('')),
    aadhaarNumber: z.string().optional().or(z.literal('')),
    uanNumber: z.string().optional().or(z.literal('')),
    esiNumber: z.string().optional().or(z.literal('')),
    pfAccountNumber: z.string().optional().or(z.literal('')),
    bankName: z.string().optional().or(z.literal('')),
    bankIfsc: z.string().optional().or(z.literal('')),
    bankAccountNumber: z.string().optional().or(z.literal('')),
    primarySiteId: z.string().optional().or(z.literal('')),
    workShiftStart: z.string().optional().or(z.literal('')),
    workShiftEnd: z.string().optional().or(z.literal('')),
    shiftId: z.string().trim().max(64).optional().or(z.literal('')),
    status: z.enum(['active', 'inactive', 'invited']).optional(),
    role: z
      .enum(['employee', 'company_admin', 'reporting_manager', 'hr_manager', 'payroll_admin'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    validateVendorForEmploymentType(data.employmentType, data.vendorId, ctx);
  });

export { validateOrgConfigValue };

export const siteSchema = z.object({
  siteId: z.string().optional(),
  name: z.string().trim().min(2).max(128),
  lat: z.coerce.number().min(-90).max(90),
  long: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(20).max(50000).default(500),
  address: z.string().trim().max(512).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const shiftSchema = z.object({
  shiftId: z.string().optional(),
  name: z.string().trim().min(2).max(128),
  code: z.string().trim().min(1).max(32),
  shiftType: z
    .enum(['general', 'evening', 'night', 'rotational', 'cross_midnight'])
    .default('general'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  punchInBeforeMinutes: z.coerce.number().min(0).max(720).default(120),
  punchInAfterMinutes: z.coerce.number().min(0).max(720).default(240),
  punchOutBeforeMinutes: z.coerce.number().min(0).max(720).default(120),
  punchOutAfterMinutes: z.coerce.number().min(0).max(720).default(240),
  lateGraceMinutes: z.coerce.number().min(0).max(240).default(15),
  earlyLeaveGraceMinutes: z.coerce.number().min(0).max(240).default(15),
  fullDayMinutes: z.coerce.number().min(60).max(1440).default(480),
  halfDayMinutes: z.coerce.number().min(30).max(720).default(240),
  overtimeAfterMinutes: z.coerce.number().min(60).max(1440).default(480),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const punchSchema = z.object({
  type: z.enum(['in', 'out']),
  lat: z.number().min(-90).max(90),
  long: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  deviceId: z.string().max(128).optional(),
});

export const regularizationSchema = z.object({
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(3).max(1024),
  requestedClockIn: z.string().trim().max(16).optional().or(z.literal('')),
  requestedClockOut: z.string().trim().max(16).optional().or(z.literal('')),
  requestedOutDateIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
});

export const shiftAssignmentSchema = z.object({
  assignmentId: z.string().optional(),
  employeeId: z.string().min(1),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftId: z.string().min(1),
  sequence: z.coerce.number().min(1).max(10).default(1),
  siteId: z.string().optional().or(z.literal('')),
  note: z.string().trim().max(256).optional().or(z.literal('')),
  status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
});

export const generateRosterSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().min(1).max(62).default(7),
  /** Comma-separated shift IDs; use OFF for weekly off days in the cycle. */
  pattern: z.string().trim().min(1).max(1024),
});

export const reviewRegularizationSchema = z.object({
  regularizationId: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(512).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(256),
});

export const leaveTypeSchema = z.object({
  leaveTypeId: z.string().optional(),
  name: z.string().trim().min(2).max(128),
  code: z.string().trim().min(1).max(32),
  paid: z.coerce.boolean().default(true),
  accrualPerMonth: z.coerce.number().min(0).max(31).default(1),
  maxBalance: z.coerce.number().min(0).max(365).default(24),
  carryForward: z.coerce.boolean().default(false),
});

export const holidaySchema = z.object({
  holidayId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(128),
  region: z.string().trim().max(128).optional().or(z.literal('')),
});

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(1024).optional().or(z.literal('')),
});

export const reviewLeaveSchema = z.object({
  leaveRequestId: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
});

export const leaveBalanceAssignSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.coerce.number().min(2000).max(2100),
  balance: z.coerce.number().min(0).max(365),
});

export const salaryStructureSchema = z.object({
  employeeId: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basic: z.coerce.number().min(0).default(0),
  hra: z.coerce.number().min(0).default(0),
  specialAllowance: z.coerce.number().min(0).default(0),
  otherEarnings: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
});

export const payrollRunSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const threePlVendorSchema = z.object({
  vendorId: z.string().optional(),
  name: z.string().trim().min(2).max(128),
  contactName: z.string().trim().max(128).optional().or(z.literal('')),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().max(32).optional().or(z.literal('')),
});
