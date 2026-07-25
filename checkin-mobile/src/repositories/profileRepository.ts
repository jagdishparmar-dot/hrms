import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import { AppwriteConfig } from '@/src/config/appwrite';
import { authHeaders } from '@/src/services/apiClient';
import type { EmployeeDocument, UserProfile } from '@/src/types';

export type ProfileSnapshot = {
  employee: Record<string, unknown>;
  reportingManager: string;
  profilePictureUrl: string;
  documents: EmployeeDocument[];
};

function mapApiEmployeeToProfile(
  employee: Record<string, unknown>,
  reportingManager: string,
  profilePictureUrl: string,
  documents: EmployeeDocument[],
  geofence: Pick<
    UserProfile,
    'officeLocation' | 'officeLatitude' | 'officeLongitude' | 'geofenceRadiusMeters' | 'lastKnownDistanceMeters' | 'isWithinGeofence'
  >,
): UserProfile {
  return {
    id: String(employee.id || ''),
    userId: String(employee.userId || ''),
    companyId: String(employee.companyId || ''),
    name: String(employee.name || ''),
    role: String(employee.designation || employee.role || 'employee'),
    employeeId: String(employee.employeeCode || ''),
    department: String(employee.department || 'General'),
    officeLocation: geofence.officeLocation,
    officeLatitude: geofence.officeLatitude,
    officeLongitude: geofence.officeLongitude,
    geofenceRadiusMeters: geofence.geofenceRadiusMeters,
    lastKnownDistanceMeters: geofence.lastKnownDistanceMeters,
    isWithinGeofence: geofence.isWithinGeofence,
    mustChangePassword: Boolean(employee.mustChangePassword),
    workShiftStart: String(employee.workShiftStart || '09:00'),
    workShiftEnd: String(employee.workShiftEnd || '18:00'),
    phone: String(employee.phone || ''),
    workEmail: String(employee.email || ''),
    dateOfJoining: String(employee.dateOfJoining || ''),
    employmentType: String(employee.employmentType || 'Permanent'),
    reportingManager,
    grade: String(employee.grade || ''),
    gender: String(employee.gender || ''),
    dateOfBirth: String(employee.dateOfBirth || ''),
    bloodGroup: String(employee.bloodGroup || ''),
    currentAddressLine1: String(employee.currentAddressLine1 || ''),
    currentAddressLine2: String(employee.currentAddressLine2 || ''),
    currentCity: String(employee.currentCity || ''),
    currentState: String(employee.currentState || ''),
    currentPincode: String(employee.currentPincode || ''),
    panNumber: String(employee.panNumber || ''),
    aadhaarNumber: String(employee.aadhaarNumber || ''),
    uanNumber: String(employee.uanNumber || ''),
    esiNumber: String(employee.esiNumber || ''),
    pfAccountNumber: String(employee.pfAccountNumber || ''),
    bankName: String(employee.bankName || ''),
    bankIfsc: String(employee.bankIfsc || ''),
    bankAccountNumber: String(employee.bankAccountNumber || ''),
    emergencyContactName: String(employee.emergencyContactName || ''),
    emergencyContactPhone: String(employee.emergencyContactPhone || ''),
    profilePictureUrl,
    documents,
  };
}

export const profileRepository = {
  async fetchProfile(
    companyId: string | null,
    geofence: Pick<
      UserProfile,
      'officeLocation' | 'officeLatitude' | 'officeLongitude' | 'geofenceRadiusMeters' | 'lastKnownDistanceMeters' | 'isWithinGeofence'
    >,
  ): Promise<UserProfile> {
    const headers = await authHeaders(companyId);
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/profile`, { headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to load profile');
    }
    return mapApiEmployeeToProfile(
      data.employee as Record<string, unknown>,
      String(data.reportingManager || ''),
      String(data.profilePictureUrl || ''),
      (data.documents || []) as EmployeeDocument[],
      geofence,
    );
  },

  async updateProfile(
    companyId: string | null,
    patch: Record<string, string>,
    geofence: Pick<
      UserProfile,
      'officeLocation' | 'officeLatitude' | 'officeLongitude' | 'geofenceRadiusMeters' | 'lastKnownDistanceMeters' | 'isWithinGeofence'
    >,
  ): Promise<UserProfile> {
    const headers = await authHeaders(companyId);
    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to update profile');
    }
    return mapApiEmployeeToProfile(
      data.employee as Record<string, unknown>,
      String(data.reportingManager || ''),
      String(data.profilePictureUrl || ''),
      (data.documents || []) as EmployeeDocument[],
      geofence,
    );
  },

  documentFileUrl(documentId: string) {
    return `${AppwriteConfig.apiBaseUrl}/api/v1/me/profile/documents/${documentId}/file`;
  },

  async uploadDocument(params: {
    companyId: string | null;
    category: EmployeeDocument['category'];
    title: string;
    uri: string;
    fileName: string;
    mimeType: string;
    geofence: Pick<
      UserProfile,
      'officeLocation' | 'officeLatitude' | 'officeLongitude' | 'geofenceRadiusMeters' | 'lastKnownDistanceMeters' | 'isWithinGeofence'
    >;
  }): Promise<UserProfile> {
    const headers = await authHeaders(params.companyId);
    const dataBase64 = await readAsStringAsync(params.uri, {
      encoding: EncodingType.Base64,
    });
    const mimeType =
      params.mimeType === 'image/jpg' ? 'image/jpeg' : params.mimeType || 'application/octet-stream';

    const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/profile/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        category: params.category,
        title: params.title,
        fileName: params.fileName,
        mimeType,
        dataBase64,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to upload document');
    }
    return mapApiEmployeeToProfile(
      data.employee as Record<string, unknown>,
      String(data.reportingManager || ''),
      String(data.profilePictureUrl || ''),
      (data.documents || []) as EmployeeDocument[],
      params.geofence,
    );
  },

  async deleteDocument(
    companyId: string | null,
    documentId: string,
    geofence: Pick<
      UserProfile,
      'officeLocation' | 'officeLatitude' | 'officeLongitude' | 'geofenceRadiusMeters' | 'lastKnownDistanceMeters' | 'isWithinGeofence'
    >,
  ): Promise<UserProfile> {
    const headers = await authHeaders(companyId);
    const res = await fetch(
      `${AppwriteConfig.apiBaseUrl}/api/v1/me/profile/documents/${documentId}`,
      { method: 'DELETE', headers },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to delete document');
    }
    return mapApiEmployeeToProfile(
      data.employee as Record<string, unknown>,
      String(data.reportingManager || ''),
      String(data.profilePictureUrl || ''),
      (data.documents || []) as EmployeeDocument[],
      geofence,
    );
  },
};
