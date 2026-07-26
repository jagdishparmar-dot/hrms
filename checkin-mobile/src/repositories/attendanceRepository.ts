import type { Models } from 'react-native-appwrite';

import { AppwriteConfig } from '@/src/config/appwrite';
import { databases, Query } from '@/src/lib/appwrite';
import { authHeaders, warmAuthHeaders } from '@/src/services/apiClient';
import type { CachedPunchLocation } from '@/src/services/locationService';
import { profileRepository } from '@/src/repositories/profileRepository';
import type {
  AttendancePolicy,
  AttendanceRecord,
  AttendanceStatus,
  LocationResult,
  RegularizationRequest,
  UserProfile,
} from '@/src/types';
import { formatDuration } from '@/src/utils/dateTime';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  userId: '',
  name: 'Employee',
  role: 'employee',
  employeeId: '',
  department: 'General',
  officeLocation: 'Unassigned site',
  officeLatitude: 19.077,
  officeLongitude: 72.998,
  geofenceRadiusMeters: 500,
  lastKnownDistanceMeters: 1,
  isWithinGeofence: true,
  attendancePolicy: 'geofenced',
  workShiftStart: '09:00',
  workShiftEnd: '18:00',
  phone: '',
  workEmail: '',
  dateOfJoining: '',
  employmentType: 'Permanent',
  reportingManager: '',
  grade: '',
  gender: '',
  dateOfBirth: '',
  bloodGroup: '',
  currentAddressLine1: '',
  currentAddressLine2: '',
  currentCity: '',
  currentState: '',
  currentPincode: '',
  profilePictureUrl: '',
  documents: [],
  panNumber: '',
  aadhaarNumber: '',
  uanNumber: '',
  esiNumber: '',
  pfAccountNumber: '',
  bankName: '',
  bankIfsc: '',
  bankAccountNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

type EmployeeDoc = Models.Document & {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  employeeCode?: string | null;
  department?: string | null;
  designation?: string | null;
  primarySiteId?: string | null;
  workShiftStart?: string | null;
  workShiftEnd?: string | null;
  phone?: string | null;
  employmentType?: string | null;
  dateOfJoining?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  uanNumber?: string | null;
  esiNumber?: string | null;
  pfAccountNumber?: string | null;
  bankName?: string | null;
  bankIfsc?: string | null;
  bankAccountNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentAddressLine1?: string | null;
  currentAddressLine2?: string | null;
  currentPincode?: string | null;
  profilePictureFileId?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  grade?: string | null;
  mustChangePassword?: boolean | null;
  attendancePolicy?: string | null;
};

type AttendanceDoc = Models.Document & {
  userId: string;
  dateIso: string;
  dayOfWeek?: string | null;
  formattedDate?: string | null;
  clockInTime?: string | null;
  clockInTimestamp?: number | null;
  clockOutTime?: string | null;
  clockOutTimestamp?: number | null;
  totalMinutes?: number | null;
  status: string;
  locationName?: string | null;
  distanceMeters?: number | null;
  note?: string | null;
};

type SiteDoc = Models.Document & {
  name: string;
  lat: number;
  long: number;
  radiusMeters: number;
  address?: string | null;
};

function str(value: string | null | undefined, fallback = '') {
  return value?.trim() ? value : fallback;
}

function mapAttendance(doc: AttendanceDoc): AttendanceRecord {
  const totalMinutes = Number(doc.totalMinutes || 0);
  return {
    id: doc.$id,
    documentId: doc.$id,
    userId: doc.userId,
    dateIso: doc.dateIso,
    dayOfWeek: str(doc.dayOfWeek),
    formattedDate: str(doc.formattedDate, doc.dateIso),
    clockInTime: str(doc.clockInTime),
    clockInTimestamp: Number(doc.clockInTimestamp || 0),
    clockOutTime: doc.clockOutTime ?? null,
    clockOutTimestamp: doc.clockOutTimestamp ?? null,
    totalHoursFormatted: formatDuration(totalMinutes),
    totalMinutes,
    status: doc.status as AttendanceStatus,
    locationName: str(doc.locationName),
    distanceMeters: Number(doc.distanceMeters || 0),
    note: doc.note ?? null,
  };
}

/** Punch API returns server shape (totalMinutes only); normalize for mobile UI. */
function normalizePunchRecord(record: Record<string, unknown>): AttendanceRecord {
  const totalMinutes = Number(record.totalMinutes || 0);
  const id = String(record.id || '');
  return {
    id,
    documentId: id,
    userId: String(record.userId || ''),
    dateIso: String(record.dateIso || ''),
    dayOfWeek: String(record.dayOfWeek || ''),
    formattedDate: String(record.formattedDate || record.dateIso || ''),
    clockInTime: String(record.clockInTime || ''),
    clockInTimestamp: Number(record.clockInTimestamp || 0),
    clockOutTime: record.clockOutTime ? String(record.clockOutTime) : null,
    clockOutTimestamp:
      record.clockOutTimestamp != null ? Number(record.clockOutTimestamp) : null,
    totalHoursFormatted: formatDuration(totalMinutes),
    totalMinutes,
    status: (record.status as AttendanceStatus) || 'PRESENT',
    locationName: String(record.locationName || ''),
    distanceMeters: Number(record.distanceMeters || 0),
    note: record.note ? String(record.note) : null,
  };
}

export class AttendanceRepository {
  private currentUserId: string | null = null;
  private cachedProfile: UserProfile | null = null;
  private companyId: string | null = null;
  private locationState: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    lastKnownDistanceMeters: number;
    isWithinGeofence: boolean;
    updatedAt: number | null;
  } = {
    latitude: null,
    longitude: null,
    accuracy: null,
    lastKnownDistanceMeters: 1,
    isWithinGeofence: true,
    updatedAt: null,
  };

  setUserId(userId: string | null) {
    this.currentUserId = userId;
    if (!userId) {
      this.cachedProfile = null;
      this.companyId = null;
    }
  }

  setCompanyId(companyId: string | null) {
    this.companyId = companyId;
    this.cachedProfile = null;
  }

  getCompanyId() {
    return this.companyId;
  }

  private requireUserId(): string {
    if (!this.currentUserId) {
      throw new Error('You must be signed in to continue.');
    }
    return this.currentUserId;
  }

  async ensureProfileForUser(params: {
    userId: string;
    name: string;
    email?: string;
  }): Promise<UserProfile> {
    this.currentUserId = params.userId;
    const profile = await this.getUserProfile();
    if (!profile) {
      throw new Error(
        'No employee record found. Ask your HR admin to provision your account.',
      );
    }
    return profile;
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const userId = this.requireUserId();
    const queries = [
      Query.equal('userId', userId),
      Query.equal('status', 'active'),
      Query.limit(10),
    ];
    const result = await databases.listDocuments<EmployeeDoc>(
      AppwriteConfig.databaseId,
      AppwriteConfig.employeesCollectionId,
      queries,
    );
    if (result.documents.length === 0) return null;

    const doc =
      (this.companyId
        ? result.documents.find((d) => d.companyId === this.companyId)
        : null) || result.documents[0];
    this.companyId = doc.companyId;

    let officeLatitude = DEFAULT_USER_PROFILE.officeLatitude;
    let officeLongitude = DEFAULT_USER_PROFILE.officeLongitude;
    let officeLocation = 'Unassigned site';
    let geofenceRadiusMeters = DEFAULT_USER_PROFILE.geofenceRadiusMeters;

    if (doc.primarySiteId) {
      try {
        const site = await databases.getDocument<SiteDoc>(
          AppwriteConfig.databaseId,
          AppwriteConfig.sitesCollectionId,
          doc.primarySiteId,
        );
        officeLatitude = Number(site.lat);
        officeLongitude = Number(site.long);
        officeLocation = site.name || site.address || officeLocation;
        geofenceRadiusMeters = Number(site.radiusMeters || 500);
      } catch {
        /* site missing */
      }
    }

    const attendancePolicy: AttendancePolicy =
      doc.attendancePolicy === 'gps_logged' || doc.attendancePolicy === 'manual'
        ? doc.attendancePolicy
        : 'geofenced';

    const geofence = {
      officeLocation,
      officeLatitude,
      officeLongitude,
      geofenceRadiusMeters,
      lastKnownDistanceMeters: this.locationState.lastKnownDistanceMeters,
      isWithinGeofence: this.locationState.isWithinGeofence,
      attendancePolicy,
    };

    try {
      this.cachedProfile = await profileRepository.fetchProfile(doc.companyId, geofence);
      return this.cachedProfile;
    } catch {
      this.cachedProfile = {
        id: doc.$id,
        userId: doc.userId,
        companyId: doc.companyId,
        name: doc.name,
        role: doc.designation || doc.role || 'employee',
        employeeId: str(doc.employeeCode),
        department: str(doc.department, 'General'),
        ...geofence,
        mustChangePassword: Boolean(doc.mustChangePassword),
        workShiftStart: str(doc.workShiftStart, '09:00'),
        workShiftEnd: str(doc.workShiftEnd, '18:00'),
        phone: str(doc.phone),
        workEmail: str(doc.email),
        dateOfJoining: str(doc.dateOfJoining),
        employmentType: str(doc.employmentType, 'Permanent'),
        reportingManager: '',
        grade: str(doc.grade),
        gender: str(doc.gender),
        dateOfBirth: str(doc.dateOfBirth),
        bloodGroup: str(doc.bloodGroup),
        currentAddressLine1: str(doc.currentAddressLine1),
        currentAddressLine2: str(doc.currentAddressLine2),
        currentCity: str(doc.currentCity),
        currentState: str(doc.currentState),
        currentPincode: str(doc.currentPincode),
        panNumber: str(doc.panNumber),
        aadhaarNumber: str(doc.aadhaarNumber),
        uanNumber: str(doc.uanNumber),
        esiNumber: str(doc.esiNumber),
        pfAccountNumber: str(doc.pfAccountNumber),
        bankName: str(doc.bankName),
        bankIfsc: str(doc.bankIfsc),
        bankAccountNumber: str(doc.bankAccountNumber),
        emergencyContactName: str(doc.emergencyContactName),
        emergencyContactPhone: str(doc.emergencyContactPhone),
        documents: [],
      };
      return this.cachedProfile;
    }
  }

  getLocationCache(): CachedPunchLocation | null {
    const { latitude, longitude, updatedAt } = this.locationState;
    if (latitude == null || longitude == null || updatedAt == null) {
      return null;
    }

    return {
      latitude,
      longitude,
      accuracy: this.locationState.accuracy,
      distanceMeters: this.locationState.lastKnownDistanceMeters,
      isWithinGeofence: this.locationState.isWithinGeofence,
      updatedAt,
    };
  }

  async warmPunchAuth() {
    await warmAuthHeaders(this.companyId);
  }

  async updateLocationStatus(location: LocationResult) {
    this.locationState = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      lastKnownDistanceMeters: location.distanceMeters,
      isWithinGeofence: location.isWithinGeofence,
      updatedAt: Date.now(),
    };
    if (this.cachedProfile) {
      this.cachedProfile = {
        ...this.cachedProfile,
        lastKnownDistanceMeters: location.distanceMeters,
        isWithinGeofence: location.isWithinGeofence,
      };
      return this.cachedProfile;
    }
    return (await this.getUserProfile()) ?? DEFAULT_USER_PROFILE;
  }

  async saveProfile(patch: Record<string, string>): Promise<UserProfile> {
    const current = this.cachedProfile ?? (await this.getUserProfile());
    if (!current) {
      throw new Error('Employee record not found.');
    }
    const geofence = {
      officeLocation: current.officeLocation,
      officeLatitude: current.officeLatitude,
      officeLongitude: current.officeLongitude,
      geofenceRadiusMeters: current.geofenceRadiusMeters,
      lastKnownDistanceMeters: current.lastKnownDistanceMeters,
      isWithinGeofence: current.isWithinGeofence,
    };
    this.cachedProfile = await profileRepository.updateProfile(
      this.companyId,
      patch,
      geofence,
    );
    return this.cachedProfile;
  }

  async getAllRecords(): Promise<AttendanceRecord[]> {
    const userId = this.requireUserId();
    const result = await databases.listDocuments<AttendanceDoc>(
      AppwriteConfig.databaseId,
      AppwriteConfig.attendanceCollectionId,
      [Query.equal('userId', userId), Query.orderDesc('dateIso'), Query.limit(90)],
    );
    return result.documents.map(mapAttendance);
  }

  private async authHeaders() {
    return authHeaders(this.companyId);
  }

  async clockIn(params: {
    lat: number;
    long: number;
    accuracy?: number;
    deviceId?: string;
  }) {
    const headers = await this.authHeaders();
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/attendance/punch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'in',
        lat: params.lat,
        long: params.long,
        accuracy: params.accuracy,
        deviceId: params.deviceId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Punch in failed');
    return normalizePunchRecord(data.record as Record<string, unknown>);
  }

  async clockOut(params: {
    lat: number;
    long: number;
    accuracy?: number;
    deviceId?: string;
  }) {
    const headers = await this.authHeaders();
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/attendance/punch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'out',
        lat: params.lat,
        long: params.long,
        accuracy: params.accuracy,
        deviceId: params.deviceId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Punch out failed');
    return normalizePunchRecord(data.record as Record<string, unknown>);
  }

  async submitRegularization(params: {
    dateIso: string;
    reason: string;
    requestedClockIn?: string;
    requestedClockOut?: string;
    requestedOutDateIso?: string;
  }) {
    const headers = await this.authHeaders();
    const res = await fetch(
      `${AppwriteConfig.apiBaseUrl}/api/v1/attendance/regularization`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Regularization failed');
    return true;
  }

  async listRegularizations(): Promise<RegularizationRequest[]> {
    const headers = await this.authHeaders();
    const res = await fetch(
      `${AppwriteConfig.apiBaseUrl}/api/v1/attendance/regularization`,
      { headers },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to load regularizations');
    return (data.requests ?? []) as RegularizationRequest[];
  }
}

export const attendanceRepository = new AttendanceRepository();
