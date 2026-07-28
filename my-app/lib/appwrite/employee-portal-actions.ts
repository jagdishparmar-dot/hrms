'use server';

import { Query } from 'node-appwrite';

import { dateIsoInTimeZone } from '@/lib/attendance-shift';
import { requireTenantMember } from '@/lib/appwrite/auth';
import {
  OPEN_SHIFT_MAX_AGE_MS,
  processPunch,
} from '@/lib/appwrite/attendance';
import { appwriteConfig } from '@/lib/appwrite/config';
import {
  getEmployeeProfileSnapshot,
  updateEmployeeSelfProfile,
} from '@/lib/appwrite/employee-profile';
import { mapSite } from '@/lib/appwrite/mappers';
import { listMobileRegularizations } from '@/lib/appwrite/mobile-api';
import { getEmployeeTodayShifts } from '@/lib/appwrite/mobile-shifts';
import { mapAttendance } from '@/lib/appwrite/mappers';
import { submitRegularizationAction } from '@/lib/appwrite/phase1-actions';
import {
  listActiveShiftsForMobile,
  listEmployeeShiftChangeRequests,
  submitShiftChangeRequest,
} from '@/lib/appwrite/shift-change-requests';
import { createAdminClient } from '@/lib/appwrite/server';
import type { AttendanceRecord } from '@/lib/appwrite/types';
import { employeeSelfUpdateSchema } from '@/lib/schemas/employee-profile';
import { punchSchema, shiftChangeRequestSchema } from '@/lib/schemas/phase1';

function toErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message || fallback);
  }
  return fallback;
}

function findOpenRecord(records: AttendanceRecord[]) {
  const cutoff = Date.now() - OPEN_SHIFT_MAX_AGE_MS;
  const openRecords = records.filter(
    (record) =>
      Boolean(record.clockInTime) &&
      !record.clockOutTime &&
      Number(record.clockInTimestamp || 0) >= cutoff,
  );
  if (openRecords.length === 0) return null;
  return openRecords.reduce((latest, record) =>
    Number(record.clockInTimestamp || 0) > Number(latest.clockInTimestamp || 0)
      ? record
      : latest,
  );
}

export async function listMyAttendanceAction(limit = 90) {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    [
      Query.equal('companyId', ctx.company.id),
      Query.equal('employeeId', ctx.membership.id),
      Query.orderDesc('dateIso'),
      Query.limit(limit),
    ],
  );
  return result.documents.map((doc) =>
    mapAttendance(doc as unknown as Record<string, unknown>),
  );
}

async function resolvePrimarySiteName(siteId: string) {
  if (!siteId) return '';
  try {
    const { databases } = createAdminClient();
    const siteDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.sitesCollectionId,
      siteId,
    );
    return mapSite(siteDoc as unknown as Record<string, unknown>).name;
  } catch {
    return '';
  }
}

export async function getMyPunchPortalAction() {
  const ctx = await requireTenantMember();
  const tz = ctx.company.settings.timezone || 'Asia/Kolkata';
  const todayIso = dateIsoInTimeZone(Date.now(), tz).dateIso;
  const records = await listMyAttendanceAction(30);
  const todayRecord =
    records.find((record) => record.dateIso === todayIso) ?? null;
  const openRecord = findOpenRecord(records);
  const schedule = await getEmployeeTodayShifts({
    membership: ctx.membership,
    company: ctx.company,
  });
  const officeLocation = await resolvePrimarySiteName(ctx.membership.primarySiteId);
  const shiftChangeRequests = await listEmployeeShiftChangeRequests(ctx.membership);

  return {
    todayIso,
    timezone: tz,
    attendancePolicy: ctx.membership.attendancePolicy || 'geofenced',
    todayRecord,
    openRecord,
    schedule,
    employeeName: ctx.membership.name,
    officeLocation,
    shiftChangeRequests,
    pendingShiftChanges: shiftChangeRequests.filter((row) => row.status === 'pending').length,
  };
}

export async function punchWebAction(input: {
  type: 'in' | 'out';
  lat: number;
  long: number;
  accuracy?: number;
}) {
  const parsed = punchSchema.safeParse({
    type: input.type,
    lat: input.lat,
    long: input.long,
    accuracy: input.accuracy,
    deviceId: 'web',
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid punch payload.',
    };
  }

  const ctx = await requireTenantMember();
  if ((ctx.membership.attendancePolicy || 'geofenced') === 'manual') {
    return {
      ok: false as const,
      error: 'Self punch is disabled for your account. Contact HR.',
    };
  }

  try {
    const result = await processPunch({
      userId: ctx.user.$id,
      companyId: ctx.company.id,
      employee: ctx.membership,
      type: parsed.data.type,
      lat: parsed.data.lat,
      long: parsed.data.long,
      accuracy: parsed.data.accuracy,
      deviceId: 'web',
      timezone: ctx.company.settings.timezone || 'Asia/Kolkata',
      graceMinutes:
        ctx.company.settings.lateGraceMinutes ?? appwriteConfig.lateGraceMinutes,
    });
    return { ok: true as const, message: result.message, record: result.record };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Punch failed.') };
  }
}

export async function getMyProfilePortalAction() {
  const ctx = await requireTenantMember();
  const profile = await getEmployeeProfileSnapshot({
    membership: ctx.membership,
    company: ctx.company,
  });
  const officeLocation = await resolvePrimarySiteName(ctx.membership.primarySiteId);
  return { ...profile, officeLocation };
}

export async function updateMyProfilePortalAction(formData: FormData) {
  const ctx = await requireTenantMember();
  const parsed = employeeSelfUpdateSchema.safeParse({
    phone: formData.get('phone') || '',
    currentAddressLine1: formData.get('currentAddressLine1') || '',
    currentAddressLine2: formData.get('currentAddressLine2') || '',
    currentCity: formData.get('currentCity') || '',
    currentState: formData.get('currentState') || '',
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
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid profile data.',
    };
  }
  return updateEmployeeSelfProfile({
    membership: ctx.membership,
    company: ctx.company,
    input: parsed.data,
  });
}

export async function listMyRegularizationsAction() {
  const ctx = await requireTenantMember();
  return listMobileRegularizations(ctx.membership);
}

export async function submitMyRegularizationAction(formData: FormData) {
  await requireTenantMember();
  return submitRegularizationAction(formData);
}

export async function listMyShiftChangeRequestsAction() {
  const ctx = await requireTenantMember();
  return listEmployeeShiftChangeRequests(ctx.membership);
}

export async function listShiftCatalogAction() {
  const ctx = await requireTenantMember();
  return listActiveShiftsForMobile(ctx.company.id);
}

export async function getMyTodayShiftsAction() {
  const ctx = await requireTenantMember();
  return getEmployeeTodayShifts({
    membership: ctx.membership,
    company: ctx.company,
  });
}

export async function submitMyShiftChangeRequestAction(formData: FormData) {
  const ctx = await requireTenantMember();
  const parsed = shiftChangeRequestSchema.safeParse({
    dateIso: formData.get('dateIso'),
    requestedShiftId: formData.get('requestedShiftId'),
    reason: formData.get('reason'),
    sequence: formData.get('sequence') || 1,
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid input.',
    };
  }
  return submitShiftChangeRequest({
    membership: ctx.membership,
    company: ctx.company,
    userId: ctx.user.$id,
    input: parsed.data,
  });
}
