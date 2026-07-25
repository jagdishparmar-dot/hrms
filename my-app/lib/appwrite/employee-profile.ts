import { ID, Permission, Query, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

import { appwriteConfig } from '@/lib/appwrite/config';
import { mapEmployee, mapEmployeeDocument } from '@/lib/appwrite/mappers';
import { createAdminClient } from '@/lib/appwrite/server';
import type {
  Company,
  EmployeeDocument,
  EmployeeDocumentCategory,
  EmployeeMembership,
} from '@/lib/appwrite/types';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  EMPLOYEE_SELF_EDITABLE_KEYS,
  MAX_DOCUMENT_BYTES,
  MAX_PROFILE_PICTURE_BYTES,
  type EmployeeSelfUpdateInput,
} from '@/lib/schemas/employee-profile';

function employeeFilePermissions(teamId: string, userId: string) {
  return [
    Permission.read(Role.team(teamId)),
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.update(Role.team(teamId, 'company_admin')),
    Permission.delete(Role.user(userId)),
    Permission.delete(Role.team(teamId, 'company_admin')),
  ];
}

function employeeDocumentRowPermissions(teamId: string) {
  return [
    Permission.read(Role.team(teamId)),
    Permission.update(Role.team(teamId, 'company_admin')),
    Permission.delete(Role.team(teamId, 'company_admin')),
  ];
}

function normalizeSelfUpdate(input: EmployeeSelfUpdateInput) {
  const payload: Record<string, string> = {};
  for (const key of EMPLOYEE_SELF_EDITABLE_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (key === 'aadhaarNumber') {
      payload[key] = value.replace(/\s/g, '');
      continue;
    }
    if (key === 'panNumber' || key === 'bankIfsc') {
      payload[key] = value.toUpperCase();
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

export function buildEmployeeSelfUpdatePayload(input: EmployeeSelfUpdateInput) {
  return normalizeSelfUpdate(input);
}

export async function resolveReportingManagerName(
  companyId: string,
  reportingManagerUserId: string,
) {
  if (!reportingManagerUserId) return '';
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.equal('userId', reportingManagerUserId),
      Query.limit(1),
    ],
  );
  if (result.total === 0) return '';
  return mapEmployee(result.documents[0] as unknown as Record<string, unknown>).name;
}

export async function getEmployeeProfileSnapshot(params: {
  membership: EmployeeMembership;
  company: Company;
}) {
  const { databases } = createAdminClient();
  const doc = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    params.membership.id,
  );
  const membership = mapEmployee(doc as unknown as Record<string, unknown>);

  const reportingManager = await resolveReportingManagerName(
    params.company.id,
    membership.reportingManagerUserId,
  );
  const documents = await listEmployeeDocuments(membership.companyId, membership.id);
  const profilePictureUrl = membership.profilePictureFileId
    ? buildFilePreviewUrl(membership.profilePictureFileId)
    : '';

  return {
    employee: membership,
    reportingManager,
    profilePictureUrl,
    documents: documents.map((doc) => ({
      ...doc,
      previewUrl: `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.employeeDocumentsBucketId}/files/${doc.fileId}/preview?project=${appwriteConfig.projectId}`,
    })),
  };
}

export async function updateEmployeeSelfProfile(params: {
  membership: EmployeeMembership;
  company: Company;
  input: EmployeeSelfUpdateInput;
}) {
  if (params.membership.companyId !== params.company.id) {
    return { ok: false as const, error: 'Employee not in this company.' };
  }

  const payload = buildEmployeeSelfUpdatePayload(params.input);
  if (Object.keys(payload).length === 0) {
    return { ok: false as const, error: 'No valid fields to update.' };
  }

  const { databases } = createAdminClient();
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    params.membership.id,
    payload,
  );

  const updated = mapEmployee(
    (
      await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.employeesCollectionId,
        params.membership.id,
      )
    ) as unknown as Record<string, unknown>,
  );

  return { ok: true as const, employee: updated };
}

export async function listEmployeeDocuments(companyId: string, employeeId: string) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeeDocumentsCollectionId,
    [
      Query.equal('companyId', companyId),
      Query.equal('employeeId', employeeId),
      Query.equal('status', 'active'),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ],
  );
  return result.documents.map((d) =>
    mapEmployeeDocument(d as unknown as Record<string, unknown>),
  );
}

function normalizeMimeType(mimeType: string) {
  if (mimeType === 'image/jpg') return 'image/jpeg';
  return mimeType;
}

function validateUploadFile(params: {
  category: EmployeeDocumentCategory;
  mimeType: string;
  size: number;
}) {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(normalizeMimeType(params.mimeType) as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    return 'Unsupported file type. Use JPG, PNG, WEBP, or PDF.';
  }
  const maxBytes =
    params.category === 'profile_picture' ? MAX_PROFILE_PICTURE_BYTES : MAX_DOCUMENT_BYTES;
  if (params.size <= 0 || params.size > maxBytes) {
    return `File too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  return null;
}

export function buildFilePreviewUrl(fileId: string) {
  if (!fileId) return '';
  return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.employeeDocumentsBucketId}/files/${fileId}/preview?project=${appwriteConfig.projectId}`;
}

export async function uploadEmployeeDocument(params: {
  membership: EmployeeMembership;
  company: Company;
  uploadedByUserId: string;
  category: EmployeeDocumentCategory;
  title: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  allowEmployeeCategories?: EmployeeDocumentCategory[];
}) {
  if (params.membership.companyId !== params.company.id) {
    return { ok: false as const, error: 'Employee not in this company.' };
  }

  const validationError = validateUploadFile({
    category: params.category,
    mimeType: params.mimeType,
    size: params.buffer.byteLength,
  });
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  if (
    params.allowEmployeeCategories &&
    !params.allowEmployeeCategories.includes(params.category)
  ) {
    return { ok: false as const, error: 'You cannot upload this document category.' };
  }

  const { client, databases } = createAdminClient();
  const { Storage } = await import('node-appwrite');
  const storage = new Storage(client);
  const file = await storage.createFile(
    appwriteConfig.employeeDocumentsBucketId,
    ID.unique(),
    InputFile.fromBuffer(params.buffer, params.fileName),
    employeeFilePermissions(params.company.teamId, params.membership.userId),
  );

  const row = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeeDocumentsCollectionId,
    ID.unique(),
    {
      companyId: params.company.id,
      employeeId: params.membership.id,
      userId: params.membership.userId,
      category: params.category,
      title: params.title,
      fileId: file.$id,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.buffer.byteLength,
      uploadedByUserId: params.uploadedByUserId,
      status: 'active',
    },
    employeeDocumentRowPermissions(params.company.teamId),
  );

  if (params.category === 'profile_picture') {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      params.membership.id,
      { profilePictureFileId: file.$id },
    );
  }

  const document = mapEmployeeDocument(row as unknown as Record<string, unknown>);
  return {
    ok: true as const,
    document: {
      ...document,
      previewUrl: buildFilePreviewUrl(document.fileId),
    },
  };
}

export async function deleteEmployeeDocument(params: {
  membership: EmployeeMembership;
  company: Company;
  documentId: string;
  requesterUserId: string;
  isAdmin: boolean;
}) {
  const { databases, client } = createAdminClient();
  const doc = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeeDocumentsCollectionId,
    params.documentId,
  );
  const row = mapEmployeeDocument(doc as unknown as Record<string, unknown>);

  if (row.companyId !== params.company.id || row.employeeId !== params.membership.id) {
    return { ok: false as const, error: 'Document not found.' };
  }

  const isOwner = row.uploadedByUserId === params.requesterUserId;
  if (!params.isAdmin && !isOwner) {
    return { ok: false as const, error: 'Forbidden.' };
  }

  if (!params.isAdmin && !['identity', 'compliance', 'employment', 'profile_picture'].includes(row.category)) {
    return { ok: false as const, error: 'Forbidden.' };
  }

  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeeDocumentsCollectionId,
    row.id,
    { status: 'archived' },
  );

  if (params.membership.profilePictureFileId === row.fileId) {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      params.membership.id,
      { profilePictureFileId: '' },
    );
  }

  try {
    const { Storage } = await import('node-appwrite');
    const storage = new Storage(client);
    await storage.deleteFile(appwriteConfig.employeeDocumentsBucketId, row.fileId);
  } catch {
    /* file may already be removed */
  }

  return { ok: true as const };
}

export const EMPLOYEE_UPLOAD_CATEGORIES: EmployeeDocumentCategory[] = [
  'profile_picture',
  'identity',
  'compliance',
  'employment',
];
