import { ID, Query } from 'node-appwrite';

import { appwriteConfig } from '@/lib/appwrite/config';
import {
  mapEmployee,
  mapLeaveBalance,
  mapLeaveRequest,
  mapLeaveType,
} from '@/lib/appwrite/mappers';
import { employeeDocumentPermissions } from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';
import type {
  AttendanceStatus,
  Company,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from '@/lib/appwrite/types';

const ACTIVE_LEAVE_STATUSES: LeaveRequestStatus[] = ['pending', 'approved'];

export function dayCount(fromDate: string, toDate: string) {
  const a = new Date(`${fromDate}T00:00:00Z`).getTime();
  const b = new Date(`${toDate}T00:00:00Z`).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}

export function datesInRange(fromDate: string, toDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`).getTime();
  while (cursor.getTime() <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function rangesOverlap(
  fromA: string,
  toA: string,
  fromB: string,
  toB: string,
) {
  return fromA <= toB && fromB <= toA;
}

function dayMeta(dateIso: string, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const dayOfWeek = fmt.format(new Date(`${dateIso}T12:00:00Z`));
  return { dayOfWeek, formattedDate: dateIso };
}

export async function ensureLeaveBalance(
  companyId: string,
  teamId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  opening = 0,
) {
  const { databases } = createAdminClient();
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.leaveBalancesCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.equal('employeeId', employeeId),
      Query.equal('leaveTypeId', leaveTypeId),
      Query.equal('year', year),
      Query.limit(1),
    ],
  );
  if (existing.total > 0) {
    return mapLeaveBalance(existing.documents[0] as unknown as Record<string, unknown>);
  }
  const doc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.leaveBalancesCollectionId,
    ID.unique(),
    { companyId, employeeId, leaveTypeId, year, balance: opening },
    employeeDocumentPermissions(teamId),
  );
  return mapLeaveBalance(doc as unknown as Record<string, unknown>);
}

export async function findOverlappingLeaveRequests(params: {
  companyId: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  excludeRequestId?: string;
}) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.leaveRequestsCollectionId,
    [
      Query.equal('companyId', params.companyId),
      Query.equal('employeeId', params.employeeId),
      Query.limit(200),
    ],
  );

  return result.documents
    .map((d) => mapLeaveRequest(d as unknown as Record<string, unknown>))
    .filter(
      (row) =>
        ACTIVE_LEAVE_STATUSES.includes(row.status) &&
        row.id !== params.excludeRequestId &&
        rangesOverlap(row.fromDate, row.toDate, params.fromDate, params.toDate),
    );
}

export async function validateLeaveApplication(params: {
  companyId: string;
  teamId: string;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  excludeRequestId?: string;
}) {
  const days = dayCount(params.fromDate, params.toDate);
  if (days <= 0) {
    return { ok: false as const, error: 'Invalid date range.' };
  }

  const overlaps = await findOverlappingLeaveRequests({
    companyId: params.companyId,
    employeeId: params.employeeId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    excludeRequestId: params.excludeRequestId,
  });
  if (overlaps.length > 0) {
    const first = overlaps[0];
    return {
      ok: false as const,
      error: `Leave already ${first.status} for ${first.fromDate} to ${first.toDate}.`,
    };
  }

  const year = Number(params.fromDate.slice(0, 4));
  const balance = await ensureLeaveBalance(
    params.companyId,
    params.teamId,
    params.employeeId,
    params.leaveTypeId,
    year,
  );
  if (balance.balance < days) {
    return { ok: false as const, error: 'Insufficient leave balance.' };
  }

  return { ok: true as const, days, balance };
}

export async function assignLeaveBalance(params: {
  companyId: string;
  teamId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  balance: number;
}) {
  const { databases } = createAdminClient();
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.leaveBalancesCollectionId,
    [
      Query.equal('companyId', params.companyId),
      Query.equal('employeeId', params.employeeId),
      Query.equal('leaveTypeId', params.leaveTypeId),
      Query.equal('year', params.year),
      Query.limit(1),
    ],
  );

  const payload = {
    companyId: params.companyId,
    employeeId: params.employeeId,
    leaveTypeId: params.leaveTypeId,
    year: params.year,
    balance: params.balance,
  };

  if (existing.total > 0) {
    const doc = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.leaveBalancesCollectionId,
      existing.documents[0].$id,
      payload,
    );
    return mapLeaveBalance(doc as unknown as Record<string, unknown>);
  }

  const doc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.leaveBalancesCollectionId,
    ID.unique(),
    payload,
    employeeDocumentPermissions(params.teamId),
  );
  return mapLeaveBalance(doc as unknown as Record<string, unknown>);
}

export async function listCompanyLeaveBalances(companyId: string, year: number) {
  const { databases } = createAdminClient();
  const [balancesResult, employeesResult, typesResult] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveBalancesCollectionId,
      [Query.equal('companyId', companyId), Query.equal('year', year), Query.limit(500)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('companyId', companyId), Query.limit(500)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveTypesCollectionId,
      [Query.equal('companyId', companyId), Query.limit(100)],
    ),
  ]);

  const employees = new Map(
    employeesResult.documents.map((d) => {
      const row = mapEmployee(d as unknown as Record<string, unknown>);
      return [row.id, row.name] as const;
    }),
  );
  const types = new Map(
    typesResult.documents.map((d) => {
      const row = mapLeaveType(d as unknown as Record<string, unknown>);
      return [row.id, row] as const;
    }),
  );

  return balancesResult.documents.map((d) => {
    const row = mapLeaveBalance(d as unknown as Record<string, unknown>);
    const type = types.get(row.leaveTypeId);
    return {
      ...row,
      employeeName: employees.get(row.employeeId) || row.employeeId,
      leaveTypeName: type?.name || row.leaveTypeId,
      leaveTypeCode: type?.code || '',
    };
  });
}

function leaveAttendanceStatus(
  requestStatus: LeaveRequestStatus,
): AttendanceStatus | null {
  if (requestStatus === 'pending') return 'LEAVE_PENDING';
  if (requestStatus === 'approved') return 'ON_LEAVE';
  return null;
}

async function upsertLeaveAttendanceDay(params: {
  company: Company;
  employeeId: string;
  userId: string;
  dateIso: string;
  leaveRequestId: string;
  leaveTypeName: string;
  status: AttendanceStatus;
  teamId: string;
}) {
  const { databases } = createAdminClient();
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    [
      Query.equal('companyId', params.company.id),
      Query.equal('employeeId', params.employeeId),
      Query.equal('dateIso', params.dateIso),
      Query.limit(1),
    ],
  );

  const meta = dayMeta(params.dateIso, params.company.settings.timezone || 'Asia/Kolkata');
  const payload = {
    companyId: params.company.id,
    employeeId: params.employeeId,
    userId: params.userId,
    dateIso: params.dateIso,
    dayOfWeek: meta.dayOfWeek,
    formattedDate: meta.formattedDate,
    clockInTime: '',
    clockInTimestamp: 0,
    clockOutTime: '',
    clockOutTimestamp: 0,
    totalMinutes: 0,
    status: params.status,
    siteId: '',
    geofenceStatus: 'UNKNOWN',
    distanceMeters: 0,
    note: `Leave: ${params.leaveTypeName}`,
    locationName: 'Leave',
    leaveRequestId: params.leaveRequestId,
  };

  if (existing.total > 0) {
    const doc = existing.documents[0];
    if (doc.clockInTime) {
      // Preserve actual punch record; annotate only.
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        doc.$id,
        {
          note: `${payload.note} (punch also recorded)`,
          leaveRequestId: params.leaveRequestId,
        },
      );
      return;
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      doc.$id,
      payload,
    );
    return;
  }

  await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.attendanceCollectionId,
    ID.unique(),
    payload,
    employeeDocumentPermissions(params.teamId),
  );
}

export async function syncLeaveRequestToAttendance(params: {
  company: Company;
  teamId: string;
  request: LeaveRequest;
  leaveTypeName: string;
}) {
  const attendanceStatus = leaveAttendanceStatus(params.request.status);
  const dates = datesInRange(params.request.fromDate, params.request.toDate);

  if (!attendanceStatus) {
    await clearLeaveAttendanceForRequest({
      companyId: params.company.id,
      employeeId: params.request.employeeId,
      leaveRequestId: params.request.id,
      dates,
    });
    return;
  }

  for (const dateIso of dates) {
    await upsertLeaveAttendanceDay({
      company: params.company,
      employeeId: params.request.employeeId,
      userId: params.request.userId,
      dateIso,
      leaveRequestId: params.request.id,
      leaveTypeName: params.leaveTypeName,
      status: attendanceStatus,
      teamId: params.teamId,
    });
  }
}

export async function clearLeaveAttendanceForRequest(params: {
  companyId: string;
  employeeId: string;
  leaveRequestId: string;
  dates: string[];
}) {
  const { databases } = createAdminClient();
  for (const dateIso of params.dates) {
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      [
        Query.equal('companyId', params.companyId),
        Query.equal('employeeId', params.employeeId),
        Query.equal('dateIso', dateIso),
        Query.limit(1),
      ],
    );
    if (existing.total === 0) continue;
    const doc = existing.documents[0];
    if (String(doc.leaveRequestId || '') !== params.leaveRequestId) continue;
    if (doc.clockInTime) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.attendanceCollectionId,
        doc.$id,
        {
          note: '',
          leaveRequestId: '',
        },
      );
      continue;
    }
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.attendanceCollectionId,
      doc.$id,
    );
  }
}

export async function getLeaveTypeName(companyId: string, leaveTypeId: string) {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.leaveTypesCollectionId,
      leaveTypeId,
    );
    return mapLeaveType(doc as unknown as Record<string, unknown>).name;
  } catch {
    return leaveTypeId;
  }
}

export type LeaveBalanceRow = LeaveBalance & {
  employeeName?: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
};

export type LeaveTypeRow = LeaveType;
