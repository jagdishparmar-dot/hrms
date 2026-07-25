import { ID, Query } from 'node-appwrite';

import { writeAuditLog } from '@/lib/appwrite/audit';
import { appwriteConfig } from '@/lib/appwrite/config';
import { mapCompany, serializeCompanyPayload } from '@/lib/appwrite/mappers';
import {
  companyDocumentPermissions,
  employeeDocumentPermissions,
} from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';
import type {
  Company,
  CompanyBranding,
  CompanyFeatureFlags,
  CompanySettings,
  TenantRole,
} from '@/lib/appwrite/types';
import {
  DEFAULT_BRANDING,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_SETTINGS,
} from '@/lib/appwrite/types';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function isSlugAvailable(slug: string) {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    [Query.equal('slug', slug), Query.limit(1)],
  );
  return result.total === 0;
}

export type ProvisionCompanyInput = {
  companyName: string;
  slug?: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  actorUserId: string;
  plan?: string;
  maxEmployees?: number;
  featureFlags?: Partial<CompanyFeatureFlags>;
  branding?: Partial<CompanyBranding>;
  settings?: Partial<CompanySettings>;
};

export type ProvisionCompanyResult = {
  company: Company;
  employeeId: string;
  teamId: string;
};

/**
 * Creates Team + companies doc + owner employees row + audit log.
 * Uses admin client (privileged). Caller must have already created Auth user if needed.
 */
export async function provisionCompany(
  input: ProvisionCompanyInput,
): Promise<ProvisionCompanyResult> {
  const slug = slugify(input.slug || input.companyName);
  if (!slug || slug.length < 2) {
    throw new Error('Company slug must be at least 2 characters.');
  }

  if (!(await isSlugAvailable(slug))) {
    throw new Error(`Slug "${slug}" is already taken.`);
  }

  const { databases, teams } = createAdminClient();

  const team = await teams.create(ID.unique(), input.companyName);
  const teamId = team.$id;

  // Owner as company_admin on the team (server SDK adds member immediately)
  await teams.createMembership(
    teamId,
    ['company_admin' satisfies TenantRole],
    undefined,
    input.ownerUserId,
  );

  const companyPayload = serializeCompanyPayload({
    name: input.companyName.trim(),
    slug,
    teamId,
    plan: input.plan || 'free',
    maxEmployees: input.maxEmployees ?? 50,
    featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...input.featureFlags },
    branding: {
      ...DEFAULT_BRANDING,
      emailSenderName: input.companyName.trim(),
      ...input.branding,
    },
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
    status: 'active',
    createdByUserId: input.actorUserId,
  });

  const companyDoc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    ID.unique(),
    companyPayload,
    companyDocumentPermissions(teamId),
  );

  const employeeDoc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    ID.unique(),
    {
      companyId: companyDoc.$id,
      userId: input.ownerUserId,
      teamId,
      email: input.ownerEmail.toLowerCase(),
      name: input.ownerName.trim(),
      role: 'company_admin',
      status: 'active',
      employeeCode: 'ADMIN',
      employmentType: 'Permanent',
      department: 'HR',
      designation: 'Company Admin',
      phone: '',
      primarySiteId: '',
      alternateSiteIds: '[]',
      workShiftStart: '09:00',
      workShiftEnd: '18:00',
      shiftId: '',
      mustChangePassword: false,
      reportingManagerUserId: '',
      dateOfJoining: '',
      grade: '',
      costCenter: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      currentCity: '',
      currentState: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      panNumber: '',
      aadhaarNumber: '',
      uanNumber: '',
      esiNumber: '',
      pfAccountNumber: '',
      bankName: '',
      bankIfsc: '',
      bankAccountNumber: '',
    },
    employeeDocumentPermissions(teamId),
  );

  await writeAuditLog({
    companyId: companyDoc.$id,
    teamId,
    actorUserId: input.actorUserId,
    action: 'company.provisioned',
    entityType: 'company',
    entityId: companyDoc.$id,
    meta: { slug, ownerUserId: input.ownerUserId },
  });

  return {
    company: mapCompany(companyDoc as unknown as Record<string, unknown>),
    employeeId: employeeDoc.$id,
    teamId,
  };
}
