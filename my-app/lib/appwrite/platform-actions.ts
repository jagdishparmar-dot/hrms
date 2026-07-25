'use server';

import { ID, Query } from 'node-appwrite';

import { writeAuditLog } from '@/lib/appwrite/audit';
import { requirePlatformAdmin } from '@/lib/appwrite/auth';
import { appwriteConfig } from '@/lib/appwrite/config';
import { mapAuditLog, mapCompany, mapEmployee } from '@/lib/appwrite/mappers';
import { provisionCompany } from '@/lib/appwrite/provision';
import { createAdminClient } from '@/lib/appwrite/server';
import {
  assertNotProtectedSuperAdmin,
  DEFAULT_SUPER_ADMIN_EMAIL,
  isProtectedSuperAdminEmail,
} from '@/lib/appwrite/super-admin';
import { getCompanyById } from '@/lib/appwrite/tenant';
import type {
  AuditLog,
  CompanyStatus,
  PlatformCompanyRow,
} from '@/lib/appwrite/types';
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MODULES,
  DEFAULT_SETTINGS,
} from '@/lib/appwrite/types';
import {
  platformListCompaniesSchema,
  platformProvisionExtendedSchema,
  platformStatusChangeSchema,
  platformUpdateCompanyConfigSchema,
  platformUpdateCompanySchema,
} from '@/lib/schemas/platform';

function toErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message || fallback);
  }
  return fallback;
}

function csvList(value: string) {
  return value
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

function requireStatusConfirm(
  nextStatus: CompanyStatus,
  prevStatus: CompanyStatus,
  confirmPhrase: string,
  slug: string,
) {
  const sensitive =
    nextStatus === 'suspended' ||
    nextStatus === 'archived' ||
    (prevStatus === 'archived' && nextStatus === 'active');
  if (!sensitive) return null;
  const expected =
    nextStatus === 'archived'
      ? `ARCHIVE ${slug}`
      : nextStatus === 'suspended'
        ? `SUSPEND ${slug}`
        : `ACTIVATE ${slug}`;
  if (confirmPhrase.trim() !== expected) {
    return `Type "${expected}" to confirm this status change.`;
  }
  return null;
}


export async function getPlatformOverviewAction() {
  await requirePlatformAdmin();
  const { databases } = createAdminClient();
  const companies = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    [Query.limit(500), Query.orderDesc('$createdAt')],
  );
  const mapped = companies.documents.map((d) =>
    mapCompany(d as unknown as Record<string, unknown>),
  );

  const byStatus = {
    active: 0,
    suspended: 0,
    pending: 0,
    archived: 0,
  };
  for (const c of mapped) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }

  let totalUsers = 0;
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.limit(1)],
    );
    totalUsers = users.total;
  } catch {
    totalUsers = 0;
  }

  return {
    totalCompanies: companies.total,
    byStatus,
    totalUsers,
    recent: mapped.slice(0, 8),
    plans: mapped.reduce<Record<string, number>>((acc, c) => {
      acc[c.plan] = (acc[c.plan] || 0) + 1;
      return acc;
    }, {}),
  };
}

export async function listPlatformCompaniesAction(input?: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePlatformAdmin();
  const parsed = platformListCompaniesSchema.safeParse(input || {});
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid filters.',
      items: [] as PlatformCompanyRow[],
      total: 0,
      page: 1,
      pageSize: 25,
    };
  }

  const { q, status, page, pageSize } = parsed.data;
  const { databases } = createAdminClient();
  const queries = [Query.orderDesc('$createdAt'), Query.limit(500)];
  if (status && status !== 'all') {
    queries.unshift(Query.equal('status', status));
  }

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    queries,
  );

  let mapped = result.documents.map((d) =>
    mapCompany(d as unknown as Record<string, unknown>),
  );

  if (q) {
    const needle = q.toLowerCase();
    mapped = mapped.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.slug.toLowerCase().includes(needle) ||
        c.plan.toLowerCase().includes(needle),
    );
  }

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  const pageItems = mapped.slice(start, start + pageSize);

  const items: PlatformCompanyRow[] = await Promise.all(
    pageItems.map(async (company) => {
      try {
        const all = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.employeesCollectionId,
          [Query.equal('companyId', company.id), Query.limit(1)],
        );
        const active = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.employeesCollectionId,
          [
            Query.equal('companyId', company.id),
            Query.equal('status', 'active'),
            Query.limit(1),
          ],
        );
        return {
          ...company,
          userCount: all.total,
          activeUserCount: active.total,
        };
      } catch {
        return { ...company, userCount: 0, activeUserCount: 0 };
      }
    }),
  );

  return {
    ok: true as const,
    items,
    total,
    page,
    pageSize,
  };
}

export async function getPlatformCompanyDetailAction(companyId: string) {
  await requirePlatformAdmin();
  const company = await getCompanyById(companyId);
  if (!company) return null;

  const { databases } = createAdminClient();
  const [employees, audits] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.orderAsc('name'),
        Query.limit(50),
      ],
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.auditLogsCollectionId,
      [
        Query.equal('companyId', companyId),
        Query.orderDesc('$createdAt'),
        Query.limit(40),
      ],
    ),
  ]);

  const memberships = employees.documents.map((d) =>
    mapEmployee(d as unknown as Record<string, unknown>),
  );
  const auditLogs = audits.documents.map((d) =>
    mapAuditLog(d as unknown as Record<string, unknown>),
  );

  return {
    company,
    memberships,
    auditLogs,
    metrics: {
      users: employees.total,
      activeUsers: memberships.filter((m) => m.status === 'active').length,
      admins: memberships.filter((m) => m.role === 'company_admin').length,
    },
  };
}

export async function platformProvisionCompanyExtendedAction(formData: FormData) {
  await requirePlatformAdmin();
  const actor = await requirePlatformAdmin();

  const parsed = platformProvisionExtendedSchema.safeParse({
    companyName: formData.get('companyName'),
    slug: formData.get('slug'),
    adminName: formData.get('adminName'),
    adminEmail: formData.get('adminEmail'),
    adminPassword: formData.get('adminPassword'),
    plan: formData.get('plan') || 'free',
    maxEmployees: formData.get('maxEmployees') || 50,
    timezone: formData.get('timezone') || 'Asia/Kolkata',
    currency: formData.get('currency') || 'INR',
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;

  try {
    const { users } = createAdminClient();
    const adminUser = await users.create(
      ID.unique(),
      data.adminEmail,
      undefined,
      data.adminPassword,
      data.adminName,
    );

    const { company } = await provisionCompany({
      companyName: data.companyName,
      slug: data.slug,
      ownerUserId: adminUser.$id,
      ownerEmail: data.adminEmail,
      ownerName: data.adminName,
      actorUserId: actor.$id,
      plan: data.plan,
      maxEmployees: data.maxEmployees,
    });

    const { databases } = createAdminClient();
    const settings = {
      ...DEFAULT_SETTINGS,
      ...company.settings,
      timezone: data.timezone,
      currency: data.currency,
      modules: DEFAULT_MODULES,
    };
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      company.id,
      { settings: JSON.stringify(settings) },
    );

    await writeAuditLog({
      companyId: company.id,
      teamId: company.teamId,
      actorUserId: actor.$id,
      action: 'company.provisioned.platform',
      entityType: 'company',
      entityId: company.id,
      meta: { plan: data.plan, slug: data.slug },
    });

    return { ok: true as const, companyId: company.id };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to provision company.'),
    };
  }
}

export async function updatePlatformCompanyAction(formData: FormData) {
  await requirePlatformAdmin();
  const actor = await requirePlatformAdmin();

  const parsed = platformUpdateCompanySchema.safeParse({
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    plan: formData.get('plan'),
    maxEmployees: formData.get('maxEmployees'),
    status: formData.get('status'),
    payroll3pl: formData.get('payroll3pl') === 'on' || formData.get('payroll3pl') === 'true',
    geofencing: formData.get('geofencing') === 'on' || formData.get('geofencing') === 'true',
    selfiePunch:
      formData.get('selfiePunch') === 'on' || formData.get('selfiePunch') === 'true',
    sso: formData.get('sso') === 'on' || formData.get('sso') === 'true',
    confirmPhrase: formData.get('confirmPhrase') || '',
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const company = await getCompanyById(data.companyId);
  if (!company) return { ok: false as const, error: 'Company not found.' };

  const confirmError = requireStatusConfirm(
    data.status,
    company.status,
    data.confirmPhrase || '',
    company.slug,
  );
  if (confirmError) return { ok: false as const, error: confirmError };

  const featureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...company.featureFlags,
    payroll3pl: data.payroll3pl ?? company.featureFlags.payroll3pl,
    geofencing: data.geofencing ?? company.featureFlags.geofencing,
    selfiePunch: data.selfiePunch ?? company.featureFlags.selfiePunch,
    sso: data.sso ?? company.featureFlags.sso,
  };

  try {
    const { databases } = createAdminClient();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      company.id,
      {
        name: data.name,
        plan: data.plan,
        maxEmployees: data.maxEmployees,
        status: data.status,
        featureFlags: JSON.stringify(featureFlags),
      },
    );

    await writeAuditLog({
      companyId: company.id,
      teamId: company.teamId,
      actorUserId: actor.$id,
      action: 'company.platform_updated',
      entityType: 'company',
      entityId: company.id,
      meta: {
        plan: data.plan,
        status: data.status,
        name: data.name,
        featureFlags,
        previousStatus: company.status,
      },
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to update company.'),
    };
  }
}

export async function changePlatformCompanyStatusAction(formData: FormData) {
  await requirePlatformAdmin();
  const actor = await requirePlatformAdmin();

  const parsed = platformStatusChangeSchema.safeParse({
    companyId: formData.get('companyId'),
    status: formData.get('status'),
    confirmPhrase: formData.get('confirmPhrase'),
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const company = await getCompanyById(data.companyId);
  if (!company) return { ok: false as const, error: 'Company not found.' };

  const confirmError = requireStatusConfirm(
    data.status,
    company.status,
    data.confirmPhrase,
    company.slug,
  );
  if (confirmError) return { ok: false as const, error: confirmError };

  try {
    const { databases } = createAdminClient();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      company.id,
      { status: data.status },
    );

    await writeAuditLog({
      companyId: company.id,
      teamId: company.teamId,
      actorUserId: actor.$id,
      action: `company.status.${data.status}`,
      entityType: 'company',
      entityId: company.id,
      meta: { previousStatus: company.status, status: data.status },
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to change company status.'),
    };
  }
}

export async function updatePlatformCompanyConfigAction(formData: FormData) {
  await requirePlatformAdmin();
  const actor = await requirePlatformAdmin();

  const parsed = platformUpdateCompanyConfigSchema.safeParse({
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    legalName: formData.get('legalName') || '',
    gstin: formData.get('gstin') || '',
    registeredAddress: formData.get('registeredAddress') || '',
    contactEmail: formData.get('contactEmail') || '',
    contactPhone: formData.get('contactPhone') || '',
    timezone: formData.get('timezone'),
    currency: formData.get('currency'),
    workWeek: formData.get('workWeek'),
    jurisdictions: formData.get('jurisdictions'),
    lateGraceMinutes: formData.get('lateGraceMinutes') || 15,
    payCycleDay: formData.get('payCycleDay') || 1,
    dataRetentionDays: formData.get('dataRetentionDays') || 365,
    logoUrl: formData.get('logoUrl') || '',
    primaryColor: formData.get('primaryColor') || '',
    emailSenderName: formData.get('emailSenderName') || '',
    moduleAttendance:
      formData.get('moduleAttendance') === 'on' ||
      formData.get('moduleAttendance') === 'true',
    moduleLeave:
      formData.get('moduleLeave') === 'on' || formData.get('moduleLeave') === 'true',
    modulePayroll:
      formData.get('modulePayroll') === 'on' || formData.get('modulePayroll') === 'true',
    moduleShifts:
      formData.get('moduleShifts') === 'on' || formData.get('moduleShifts') === 'true',
    moduleDocuments:
      formData.get('moduleDocuments') === 'on' ||
      formData.get('moduleDocuments') === 'true',
    geofencing:
      formData.get('geofencing') === 'on' || formData.get('geofencing') === 'true',
    payroll3pl:
      formData.get('payroll3pl') === 'on' || formData.get('payroll3pl') === 'true',
    selfiePunch:
      formData.get('selfiePunch') === 'on' || formData.get('selfiePunch') === 'true',
    sso: formData.get('sso') === 'on' || formData.get('sso') === 'true',
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const company = await getCompanyById(data.companyId);
  if (!company) return { ok: false as const, error: 'Company not found.' };

  const workWeek = csvList(data.workWeek).map((d) => d.toLowerCase());
  const jurisdictions = csvList(data.jurisdictions);

  const settings = {
    ...DEFAULT_SETTINGS,
    ...company.settings,
    legalName: data.legalName || '',
    gstin: data.gstin || '',
    registeredAddress: data.registeredAddress || '',
    contactEmail: data.contactEmail || '',
    contactPhone: data.contactPhone || '',
    timezone: data.timezone,
    currency: data.currency,
    workWeek: workWeek.length ? workWeek : company.settings.workWeek,
    jurisdictions: jurisdictions.length
      ? jurisdictions
      : company.settings.jurisdictions,
    lateGraceMinutes: data.lateGraceMinutes ?? 15,
    payCycleDay: data.payCycleDay ?? 1,
    dataRetentionDays: data.dataRetentionDays ?? 365,
    modules: {
      ...DEFAULT_MODULES,
      ...(company.settings.modules || {}),
      attendance: data.moduleAttendance ?? true,
      leave: data.moduleLeave ?? true,
      payroll: data.modulePayroll ?? true,
      shifts: data.moduleShifts ?? true,
      documents: data.moduleDocuments ?? true,
    },
  };

  const branding = {
    ...company.branding,
    logoUrl: data.logoUrl || company.branding.logoUrl,
    primaryColor: data.primaryColor || company.branding.primaryColor,
    emailSenderName: data.emailSenderName || company.branding.emailSenderName,
  };

  const featureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...company.featureFlags,
    geofencing: data.geofencing ?? company.featureFlags.geofencing,
    payroll3pl: data.payroll3pl ?? company.featureFlags.payroll3pl,
    selfiePunch: data.selfiePunch ?? company.featureFlags.selfiePunch,
    sso: data.sso ?? company.featureFlags.sso,
  };

  try {
    const { databases } = createAdminClient();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      company.id,
      {
        name: data.name,
        settings: JSON.stringify(settings),
        branding: JSON.stringify(branding),
        featureFlags: JSON.stringify(featureFlags),
      },
    );

    await writeAuditLog({
      companyId: company.id,
      teamId: company.teamId,
      actorUserId: actor.$id,
      action: 'company.config_updated',
      entityType: 'company',
      entityId: company.id,
      meta: {
        settings: {
          timezone: settings.timezone,
          currency: settings.currency,
          modules: settings.modules,
          dataRetentionDays: settings.dataRetentionDays,
        },
        branding: { primaryColor: branding.primaryColor },
        featureFlags,
      },
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to update company configuration.'),
    };
  }
}

export async function listPlatformAdminsAction() {
  await requirePlatformAdmin();
  const { users } = createAdminClient();
  const emails = appwriteConfig.platformAdminEmails;

  const rows = await Promise.all(
    emails.map(async (email) => {
      try {
        const list = await users.list([Query.equal('email', email), Query.limit(1)]);
        const user = list.users[0];
        return {
          email,
          exists: Boolean(user),
          userId: user?.$id ?? null,
          name: user?.name ?? null,
          status: user ? (user.status ? 'active' : 'blocked') : 'missing',
          protected: isProtectedSuperAdminEmail(email),
          isDefault: email === DEFAULT_SUPER_ADMIN_EMAIL,
        };
      } catch {
        return {
          email,
          exists: false,
          userId: null,
          name: null,
          status: 'unknown' as const,
          protected: isProtectedSuperAdminEmail(email),
          isDefault: email === DEFAULT_SUPER_ADMIN_EMAIL,
        };
      }
    }),
  );

  return rows;
}

/** Hard safeguard — platform tooling must never delete the default Super Admin. */
export async function deletePlatformUserAction(userId: string, email: string) {
  await requirePlatformAdmin();
  try {
    assertNotProtectedSuperAdmin(email, 'delete');
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Protected account.') };
  }

  try {
    const { users } = createAdminClient();
    const user = await users.get(userId);
    assertNotProtectedSuperAdmin(user.email || email, 'delete');
    // Intentionally not wired to UI — reserved for future guarded tooling.
    return {
      ok: false as const,
      error: 'User deletion is disabled in the platform console. Use Appwrite Console with dual approval.',
    };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to delete user.') };
  }
}

export async function listRecentPlatformAuditsAction(): Promise<AuditLog[]> {
  await requirePlatformAdmin();
  const { databases } = createAdminClient();
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.auditLogsCollectionId,
      [Query.orderDesc('$createdAt'), Query.limit(30)],
    );
    return result.documents.map((d) =>
      mapAuditLog(d as unknown as Record<string, unknown>),
    );
  } catch {
    return [];
  }
}
