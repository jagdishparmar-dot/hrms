import type { NextRequest } from 'next/server';
import { Account, Client, ID, Query } from 'node-appwrite';

import { appwriteConfig, COMPANY_ID_HEADER } from '@/lib/appwrite/config';
import {
  mapCompany,
  mapEmployee,
  mapHoliday,
  mapLeaveBalance,
  mapLeaveRequest,
  mapLeaveType,
  mapRegularization,
} from '@/lib/appwrite/mappers';
import { employeeDocumentPermissions } from '@/lib/appwrite/permissions';
import {
  ensureLeaveBalance,
  getLeaveTypeName,
  syncLeaveRequestToAttendance,
  validateLeaveApplication,
} from '@/lib/appwrite/leave';
import { createAdminClient } from '@/lib/appwrite/server';
import { getCompanyById, listMembershipsForUser } from '@/lib/appwrite/tenant';
import type { Company, EmployeeMembership } from '@/lib/appwrite/types';

export function getBearer(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function withMobileCors(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, x-company-id',
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function authenticateMobileUser(request: NextRequest) {
  const secret = getBearer(request);
  if (!secret) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);
  if (secret.split('.').length === 3) {
    client.setJWT(secret);
  } else {
    client.setSession(secret);
  }

  try {
    const account = new Account(client);
    const user = await account.get();
    return { ok: true as const, user, client };
  } catch {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }
}

export async function resolveMobileMembership(
  userId: string,
  companyHeader: string | null,
) {
  const memberships = await listMembershipsForUser(userId);
  if (memberships.length === 0) {
    return { ok: false as const, status: 403, error: 'No active employee membership' };
  }

  const membership =
    (companyHeader
      ? memberships.find((m) => m.companyId === companyHeader)
      : null) || memberships[0];

  const company = await getCompanyById(membership.companyId);
  if (!company) {
    return { ok: false as const, status: 403, error: 'Company not found' };
  }
  if (company.status === 'suspended') {
    return { ok: false as const, status: 403, error: 'Company suspended' };
  }

  return { ok: true as const, membership, company, memberships };
}

export async function resolveMobileContext(request: NextRequest) {
  const auth = await authenticateMobileUser(request);
  if (!auth.ok) {
    return auth;
  }

  const companyHeader = request.headers.get(COMPANY_ID_HEADER);
  const resolved = await resolveMobileMembership(auth.user.$id, companyHeader);
  if (!resolved.ok) {
    return resolved;
  }

  return {
    ok: true as const,
    user: auth.user,
    membership: resolved.membership,
    company: resolved.company,
    memberships: resolved.memberships,
  };
}

export async function listMobileMemberships(userId: string) {
  const memberships = await listMembershipsForUser(userId);
  const rows = await Promise.all(
    memberships.map(async (membership) => {
      const company = await getCompanyById(membership.companyId);
      return {
        employeeId: membership.id,
        companyId: membership.companyId,
        companyName: company?.name || membership.companyId,
        mustChangePassword: membership.mustChangePassword,
        role: membership.role,
      };
    }),
  );
  return rows;
}

export async function changeMobilePassword(params: {
  userId: string;
  jwtOrSession: string;
  currentPassword: string;
  newPassword: string;
}) {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);
  if (params.jwtOrSession.split('.').length === 3) {
    client.setJWT(params.jwtOrSession);
  } else {
    client.setSession(params.jwtOrSession);
  }

  const account = new Account(client);
  await account.updatePassword(params.newPassword, params.currentPassword);

  const { databases } = createAdminClient();
  const memberships = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [Query.equal('userId', params.userId), Query.limit(50)],
  );
  for (const doc of memberships.documents) {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      doc.$id,
      { mustChangePassword: false },
    );
  }
}

export async function getMobileLeaveSnapshot(
  membership: EmployeeMembership,
  company: Company,
) {
  const { databases } = createAdminClient();
  const year = new Date().getFullYear();

  const [typesResult, holidaysResult, requestsResult] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveTypesCollectionId,
      [Query.equal('companyId', company.id), Query.limit(50)],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.holidaysCollectionId,
      [
        Query.equal('companyId', company.id),
        Query.orderAsc('date'),
        Query.limit(200),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.leaveRequestsCollectionId,
      [
        Query.equal('companyId', company.id),
        Query.equal('employeeId', membership.id),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ],
    ),
  ]);

  const types = typesResult.documents
    .map((d) => mapLeaveType(d as unknown as Record<string, unknown>))
    .filter((t) => t.status === 'active');
  const typeById = new Map(types.map((t) => [t.id, t]));

  const balances: ReturnType<typeof mapLeaveBalance>[] = [];
  for (const type of types) {
    balances.push(
      await ensureLeaveBalance(
        company.id,
        company.teamId,
        membership.id,
        type.id,
        year,
        type.accrualPerMonth * 12,
      ),
    );
  }

  const requests = requestsResult.documents.map((d) => {
    const row = mapLeaveRequest(d as unknown as Record<string, unknown>);
    return {
      ...row,
      leaveTypeName: typeById.get(row.leaveTypeId)?.name || row.leaveTypeId,
    };
  });

  return {
    types,
    balances: balances.map((b) => ({
      ...b,
      leaveTypeName: typeById.get(b.leaveTypeId)?.name || b.leaveTypeId,
      leaveTypeCode: typeById.get(b.leaveTypeId)?.code || '',
    })),
    holidays: holidaysResult.documents.map((d) =>
      mapHoliday(d as unknown as Record<string, unknown>),
    ),
    requests,
  };
}

export async function applyMobileLeave(params: {
  membership: EmployeeMembership;
  company: Company;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  note?: string;
}) {
  const validation = await validateLeaveApplication({
    companyId: params.company.id,
    teamId: params.company.teamId,
    employeeId: params.membership.id,
    leaveTypeId: params.leaveTypeId,
    fromDate: params.fromDate,
    toDate: params.toDate,
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
      companyId: params.company.id,
      employeeId: params.membership.id,
      userId: params.membership.userId,
      leaveTypeId: params.leaveTypeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      days: validation.days,
      status: 'pending',
      approverUserId: '',
      note: params.note || '',
    },
    employeeDocumentPermissions(params.company.teamId),
  );

  const req = mapLeaveRequest(created as unknown as Record<string, unknown>);
  const leaveTypeName = await getLeaveTypeName(params.company.id, params.leaveTypeId);
  await syncLeaveRequestToAttendance({
    company: params.company,
    teamId: params.company.teamId,
    request: req,
    leaveTypeName,
  });

  return { ok: true as const };
}

export async function listMobileRegularizations(membership: EmployeeMembership) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.regularizationsCollectionId,
    [
      Query.equal('companyId', membership.companyId),
      Query.equal('employeeId', membership.id),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ],
  );
  return result.documents.map((d) =>
    mapRegularization(d as unknown as Record<string, unknown>),
  );
}
