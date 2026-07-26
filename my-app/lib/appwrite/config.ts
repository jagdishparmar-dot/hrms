import { resolvePlatformAdminEmails } from '@/lib/appwrite/super-admin';

const envPlatformAdmins = (process.env.PLATFORM_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'hr_portal',
  companiesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMPANIES_COLLECTION_ID || 'companies',
  employeesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_EMPLOYEES_COLLECTION_ID || 'employees',
  auditLogsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'audit_logs',
  sitesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SITES_COLLECTION_ID || 'sites',
  attendanceCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID || 'attendance_records',
  shiftsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  shiftAssignmentsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID ||
    'employee_shift_assignments',
  punchSegmentsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_PUNCH_SEGMENTS_COLLECTION_ID ||
    'attendance_punch_segments',
  regularizationsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_REGULARIZATIONS_COLLECTION_ID ||
    'attendance_regularizations',
  shiftChangeRequestsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SHIFT_CHANGE_REQUESTS_COLLECTION_ID ||
    'shift_change_requests',
  leaveTypesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_LEAVE_TYPES_COLLECTION_ID || 'leave_types',
  leaveBalancesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_LEAVE_BALANCES_COLLECTION_ID || 'leave_balances',
  leaveRequestsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_LEAVE_REQUESTS_COLLECTION_ID || 'leave_requests',
  holidaysCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_HOLIDAYS_COLLECTION_ID || 'holidays',
  salaryStructuresCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SALARY_STRUCTURES_COLLECTION_ID ||
    'salary_structures',
  payrollRunsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_PAYROLL_RUNS_COLLECTION_ID || 'payroll_runs',
  payslipsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_PAYSLIPS_COLLECTION_ID || 'payslips',
  payslipsBucketId: process.env.NEXT_PUBLIC_APPWRITE_PAYSLIPS_BUCKET_ID || 'payslips',
  employeeDocumentsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_EMPLOYEE_DOCUMENTS_COLLECTION_ID || 'employee_documents',
  employeeDocumentsBucketId:
    process.env.NEXT_PUBLIC_APPWRITE_EMPLOYEE_DOCUMENTS_BUCKET_ID || 'employee_documents',
  threePlVendorsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_THREE_PL_VENDORS_COLLECTION_ID || 'three_pl_vendors',
  apiKey: process.env.APPWRITE_API_KEY || '',
  /** Always includes default Super Admin; env may add more. */
  platformAdminEmails: resolvePlatformAdminEmails(envPlatformAdmins),
  apexHosts: (process.env.NEXT_PUBLIC_APEX_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
  lateGraceMinutes: Number(process.env.ATTENDANCE_LATE_GRACE_MINUTES || 15),
} as const;

export const SESSION_COOKIE = 'checkin_hr_session';
export const COMPANY_COOKIE = 'hr_company_id';
export const COMPANY_SLUG_HEADER = 'x-company-slug';
export const COMPANY_ID_HEADER = 'x-company-id';
