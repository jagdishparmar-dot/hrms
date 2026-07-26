import { ID, Query } from 'node-appwrite';

import { dateIsoInTimeZone } from '@/lib/attendance-shift';
import { appwriteConfig } from '@/lib/appwrite/config';
import { mapShiftAssignment, mapShiftChangeRequest, mapWorkShift } from '@/lib/appwrite/mappers';
import { employeeDocumentPermissions } from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';
import type {
  Company,
  EmployeeMembership,
  EmployeeShiftAssignment,
  ShiftChangeRequest,
  WorkShift,
} from '@/lib/appwrite/types';
import type { shiftChangeRequestSchema } from '@/lib/schemas/phase1';
import type { z } from 'zod';

type ShiftChangeInput = z.infer<typeof shiftChangeRequestSchema>;

async function getActiveShift(companyId: string, shiftId: string): Promise<WorkShift | null> {
  if (!shiftId.trim()) return null;
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      shiftId,
    );
    const shift = mapWorkShift(doc as unknown as Record<string, unknown>);
    if (shift.companyId !== companyId || shift.status !== 'active') return null;
    return shift;
  } catch {
    return null;
  }
}

async function findAssignmentForDate(params: {
  companyId: string;
  employeeId: string;
  dateIso: string;
  sequence: number;
}): Promise<EmployeeShiftAssignment | null> {
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      [
        Query.equal('companyId', params.companyId),
        Query.equal('employeeId', params.employeeId),
        Query.equal('dateIso', params.dateIso),
        Query.equal('sequence', params.sequence),
        Query.equal('status', 'scheduled'),
        Query.limit(1),
      ],
    );
    const doc = result.documents[0];
    if (!doc) return null;
    return mapShiftAssignment(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

async function hasPendingRequest(params: {
  companyId: string;
  employeeId: string;
  dateIso: string;
  sequence: number;
}) {
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftChangeRequestsCollectionId,
      [
        Query.equal('companyId', params.companyId),
        Query.equal('employeeId', params.employeeId),
        Query.equal('dateIso', params.dateIso),
        Query.equal('sequence', params.sequence),
        Query.equal('status', 'pending'),
        Query.limit(1),
      ],
    );
    return result.total > 0;
  } catch {
    return false;
  }
}

export async function submitShiftChangeRequest(params: {
  membership: EmployeeMembership;
  company: Company;
  userId: string;
  input: ShiftChangeInput;
}) {
  const timeZone = params.company.settings.timezone || 'Asia/Kolkata';
  const todayIso = dateIsoInTimeZone(Date.now(), timeZone).dateIso;
  if (params.input.dateIso < todayIso) {
    return { ok: false as const, error: 'Shift change can only be requested for today or future dates.' };
  }

  const requestedShift = await getActiveShift(params.membership.companyId, params.input.requestedShiftId);
  if (!requestedShift) {
    return { ok: false as const, error: 'Select a valid active shift.' };
  }

  const existingAssignment = await findAssignmentForDate({
    companyId: params.membership.companyId,
    employeeId: params.membership.id,
    dateIso: params.input.dateIso,
    sequence: params.input.sequence,
  });

  const currentShiftId =
    existingAssignment?.shiftId ||
    (params.input.dateIso === todayIso ? params.membership.shiftId : '');

  if (currentShiftId && currentShiftId === params.input.requestedShiftId) {
    return { ok: false as const, error: 'Requested shift matches your current assignment.' };
  }

  const pending = await hasPendingRequest({
    companyId: params.membership.companyId,
    employeeId: params.membership.id,
    dateIso: params.input.dateIso,
    sequence: params.input.sequence,
  });
  if (pending) {
    return { ok: false as const, error: 'A pending shift change request already exists for this date.' };
  }

  const { databases } = createAdminClient();
  await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.shiftChangeRequestsCollectionId,
    ID.unique(),
    {
      companyId: params.membership.companyId,
      employeeId: params.membership.id,
      userId: params.userId,
      dateIso: params.input.dateIso,
      sequence: params.input.sequence,
      currentShiftId: currentShiftId || '',
      currentAssignmentId: existingAssignment?.id || '',
      requestedShiftId: params.input.requestedShiftId,
      reason: params.input.reason,
      status: 'pending',
      approverUserId: '',
      reviewNote: '',
    },
    employeeDocumentPermissions(params.company.teamId),
  );

  return { ok: true as const };
}

export async function listEmployeeShiftChangeRequests(
  membership: EmployeeMembership,
): Promise<ShiftChangeRequest[]> {
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftChangeRequestsCollectionId,
      [
        Query.equal('companyId', membership.companyId),
        Query.equal('employeeId', membership.id),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ],
    );
    return result.documents.map((doc) =>
      mapShiftChangeRequest(doc as unknown as Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

export async function listActiveShiftsForMobile(companyId: string) {
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftsCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.equal('status', 'active'),
        Query.orderAsc('name'),
        Query.limit(100),
      ],
    );
    return result.documents.map((doc) => {
      const shift = mapWorkShift(doc as unknown as Record<string, unknown>);
      return {
        id: shift.id,
        name: shift.name,
        code: shift.code,
        shiftType: shift.shiftType,
        startTime: shift.startTime,
        endTime: shift.endTime,
      };
    });
  } catch {
    return [];
  }
}

async function getEmployeeSiteId(companyId: string, employeeId: string) {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      employeeId,
    );
    if (String(doc.companyId) !== companyId) return '';
    return String(doc.primarySiteId || '');
  } catch {
    return '';
  }
}

async function upsertRosterFromRequest(params: {
  company: Company;
  request: ShiftChangeRequest;
  requestedShift: WorkShift;
}) {
  const { databases } = createAdminClient();
  const employee = params.request.employeeId;
  const siteId = await getEmployeeSiteId(params.company.id, employee);
  const payload = {
    companyId: params.company.id,
    employeeId: employee,
    dateIso: params.request.dateIso,
    shiftId: params.request.requestedShiftId,
    sequence: params.request.sequence,
    siteId,
    status: 'scheduled' as const,
    note: 'Updated via approved shift change request',
  };

  if (params.request.currentAssignmentId) {
    try {
      const existing = mapShiftAssignment(
        (await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftAssignmentsCollectionId,
          params.request.currentAssignmentId,
        )) as unknown as Record<string, unknown>,
      );
      if (existing.companyId === params.company.id) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.shiftAssignmentsCollectionId,
          existing.id,
          {
            ...payload,
            siteId: existing.siteId || payload.siteId,
          },
        );
        return;
      }
    } catch {
      /* fall through to lookup/create */
    }
  }

  const assignment = await findAssignmentForDate({
    companyId: params.company.id,
    employeeId: employee,
    dateIso: params.request.dateIso,
    sequence: params.request.sequence,
  });

  if (assignment) {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.shiftAssignmentsCollectionId,
      assignment.id,
      {
        ...payload,
        siteId: assignment.siteId || payload.siteId,
      },
    );
    return;
  }

  await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.shiftAssignmentsCollectionId,
    ID.unique(),
    payload,
    employeeDocumentPermissions(params.company.teamId),
  );
}

export async function reviewShiftChangeRequest(params: {
  company: Company;
  approverUserId: string;
  requestId: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}) {
  const { databases } = createAdminClient();
  const doc = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.shiftChangeRequestsCollectionId,
    params.requestId,
  );
  const request = mapShiftChangeRequest(doc as unknown as Record<string, unknown>);
  if (request.companyId !== params.company.id) {
    return { ok: false as const, error: 'Request not found.' };
  }
  if (request.status !== 'pending') {
    return { ok: false as const, error: 'This request was already reviewed.' };
  }

  if (params.decision === 'approved') {
    const requestedShift = await getActiveShift(params.company.id, request.requestedShiftId);
    if (!requestedShift) {
      return { ok: false as const, error: 'Requested shift is no longer active.' };
    }
    await upsertRosterFromRequest({
      company: params.company,
      request,
      requestedShift,
    });
  }

  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.shiftChangeRequestsCollectionId,
    request.id,
    {
      status: params.decision,
      approverUserId: params.approverUserId,
      reviewNote: params.reviewNote || '',
    },
  );

  return { ok: true as const };
}

export async function listPendingShiftChangeRequests(companyId: string) {
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.shiftChangeRequestsCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.equal('status', 'pending'),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ],
    );
    return result.documents.map((doc) =>
      mapShiftChangeRequest(doc as unknown as Record<string, unknown>),
    );
  } catch {
    return [];
  }
}

export async function enrichShiftChangeRequests(
  companyId: string,
  rows: ShiftChangeRequest[],
  employees: { id: string; name: string }[],
  shifts: WorkShift[],
): Promise<ShiftChangeRequest[]> {
  const empById = new Map(employees.map((e) => [e.id, e.name]));
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  return rows.map((row) => {
    const current = row.currentShiftId ? shiftById.get(row.currentShiftId) : undefined;
    const requested = shiftById.get(row.requestedShiftId);
    return {
      ...row,
      employeeName: empById.get(row.employeeId),
      currentShiftName: current?.name,
      currentShiftCode: current?.code,
      requestedShiftName: requested?.name,
      requestedShiftCode: requested?.code,
    };
  });
}
