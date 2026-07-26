export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'LEAVE_PENDING';

export type EmploymentType = 'Permanent' | 'Contract' | 'Intern' | 'Consultant';

export type AttendancePolicy = 'geofenced' | 'gps_logged' | 'manual';

export type EmployeeDocumentCategory =
  | 'profile_picture'
  | 'identity'
  | 'compliance'
  | 'employment';

export interface EmployeeDocument {
  id: string;
  category: EmployeeDocumentCategory;
  title: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  /** Explicit record / document id (same as Appwrite $id when seeded). */
  documentId: string;
  userId: string;
  dateIso: string;
  dayOfWeek: string;
  formattedDate: string;
  clockInTime: string;
  clockInTimestamp: number;
  clockOutTime: string | null;
  clockOutTimestamp: number | null;
  totalHoursFormatted: string;
  totalMinutes: number;
  status: AttendanceStatus;
  locationName: string;
  distanceMeters: number;
  note: string | null;
}

/** Employee master + Indian payroll / compliance fields. */
export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  role: string;
  employeeId: string;
  department: string;
  officeLocation: string;
  officeLatitude: number;
  officeLongitude: number;
  geofenceRadiusMeters: number;
  lastKnownDistanceMeters: number;
  isWithinGeofence: boolean;
  /** geofenced = site boundary required; gps_logged = any location; manual = no self punch */
  attendancePolicy: AttendancePolicy;
  mustChangePassword?: boolean;
  companyId?: string;
  workShiftStart: string;
  workShiftEnd: string;

  // Contact & employment
  phone: string;
  workEmail: string;
  dateOfJoining: string;
  employmentType: EmploymentType | string;
  reportingManager: string;
  grade: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentState: string;
  currentPincode: string;
  profilePictureUrl?: string;
  documents?: EmployeeDocument[];

  // Indian statutory / payroll
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esiNumber: string;
  pfAccountNumber: string;
  bankName: string;
  bankIfsc: string;
  bankAccountNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export type TodayShiftSource = 'roster' | 'default';

export interface TodayShiftInfo {
  assignmentId?: string;
  dateIso: string;
  sequence: number;
  shiftId: string;
  name: string;
  code: string;
  shiftType: 'general' | 'evening' | 'night' | 'rotational' | 'cross_midnight';
  startTime: string;
  endTime: string;
  windowLabel: string;
  source: TodayShiftSource;
  note?: string;
}

export interface TodayShiftSchedule {
  dateIso: string;
  timezone: string;
  shifts: TodayShiftInfo[];
}

export interface MainUiState {
  userProfile: UserProfile;
  todayRecord: AttendanceRecord | null;
  todayShiftSchedule: TodayShiftSchedule;
  allRecords: AttendanceRecord[];
  currentTimeFormatted: string;
  currentDateFormatted: string;
  dayOfWeek: string;
  formattedDateOnly: string;
  todayIso: string;
  isClockInLoading: boolean;
  showLocationStatusSheet: boolean;
  showSuccessAnimation: boolean;
  successClockInTime: string | null;
  hasLocationPermission: boolean;
  showLocationPermissionDialog: boolean;
  snackbarMessage: string | null;
  isRefreshingLocation: boolean;
  locationError: string | null;
}

export interface LocationResult {
  latitude: number;
  longitude: number;
  distanceMeters: number;
  isWithinGeofence: boolean;
  accuracy: number | null;
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

export interface LeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  year: number;
  balance: number;
}

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approverUserId: string;
  note: string;
}

export interface Holiday {
  id: string;
  companyId: string;
  date: string;
  name: string;
  region: string;
}

export interface RegularizationRequest {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  dateIso: string;
  reason: string;
  requestedClockIn: string;
  requestedClockOut: string;
  status: 'pending' | 'approved' | 'rejected';
  approverUserId: string;
  reviewNote: string;
}

export interface ShiftCatalogItem {
  id: string;
  name: string;
  code: string;
  shiftType: TodayShiftInfo['shiftType'];
  startTime: string;
  endTime: string;
}

export interface ShiftChangeRequest {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  dateIso: string;
  sequence: number;
  currentShiftId: string;
  currentAssignmentId: string;
  requestedShiftId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverUserId: string;
  reviewNote: string;
}
