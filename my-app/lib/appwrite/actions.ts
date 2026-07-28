'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ID, Query } from 'node-appwrite';

import { writeAuditLog } from '@/lib/appwrite/audit';
import {
  getCurrentUser,
  isPlatformAdminEmail,
  requireCompanyAdmin,
  requirePlatformAdmin,
  requireTenantMember,
} from '@/lib/appwrite/auth';
import { tenantHomePath } from '@/lib/appwrite/routing';
import {
  COMPANY_COOKIE,
  SESSION_COOKIE,
  appwriteConfig,
} from '@/lib/appwrite/config';
import { mapCompany } from '@/lib/appwrite/mappers';
import { provisionCompany } from '@/lib/appwrite/provision';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import {
  getCompanyById,
  listMembershipsForUser,
} from '@/lib/appwrite/tenant';
import type { Company } from '@/lib/appwrite/types';
import { isCompanyAdminRole } from '@/lib/appwrite/types';
import {
  DEFAULT_FEATURE_FLAGS,
} from '@/lib/appwrite/types';
import {
  loginSchema,
  platformProvisionSchema,
  selectCompanySchema,
  signupSchema,
  updateCompanyPlanSchema,
  updateCompanySettingsSchema,
} from '@/lib/schemas/phase0';

function toErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message || fallback);
  }
  return fallback;
}

function isNextRedirect(error: unknown) {
  return (
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    String((error as { digest?: string }).digest || '').startsWith('NEXT_REDIRECT')
  );
}

async function setSessionCookie(userId: string) {
  const { users } = createAdminClient();
  const serverSession = await users.createSession(userId);
  if (!serverSession.secret) {
    throw new Error('Unable to create session secret. Check API key scopes.');
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, serverSession.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
}

async function setCompanyCookie(companyId: string) {
  const jar = await cookies();
  jar.set(COMPANY_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    companyName: formData.get('companyName'),
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;

  try {
    const { users } = createAdminClient();
    const user = await users.create(
      ID.unique(),
      data.email,
      undefined,
      data.password,
      data.name,
    );

    const { company } = await provisionCompany({
      companyName: data.companyName,
      ownerUserId: user.$id,
      ownerEmail: data.email,
      ownerName: data.name,
      actorUserId: user.$id,
    });

    await setSessionCookie(user.$id);
    await setCompanyCookie(company.id);
    redirect('/dashboard');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { ok: false as const, error: toErrorMessage(error, 'Unable to create company.') };
  }
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || '/dashboard',
    companyId: formData.get('companyId') || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const { email, password, companyId } = parsed.data;
  const nextPath = parsed.data.next || '/dashboard';
  const safeNext =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';

  try {
    const { Client, Account } = await import('node-appwrite');
    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    const loginAccount = new Account(client);
    const passwordSession = await loginAccount.createEmailPasswordSession(email, password);

    const platform = isPlatformAdminEmail(email);
    const { users } = createAdminClient();

    if (!platform) {
      const appwriteUser = await users.get(passwordSession.userId);
      if (!appwriteUser.emailVerification) {
        try {
          await loginAccount.deleteSession(passwordSession.$id);
        } catch {
          /* ignore */
        }
        return {
          ok: false as const,
          error: 'Please verify your email with the admin before proceeding with the login.',
        };
      }
    }

    const memberships = await listMembershipsForUser(passwordSession.userId);

    if (platform && (safeNext.startsWith('/platform') || memberships.length === 0)) {
      try {
        await loginAccount.deleteSession(passwordSession.$id);
      } catch {}
      await setSessionCookie(passwordSession.userId);
      redirect('/platform');
    }

    if (memberships.length === 0 && !platform) {
      try {
        await loginAccount.deleteSession(passwordSession.$id);
      } catch {}
      return {
        ok: false as const,
        error: 'You are not assigned to any active company. Please contact support or your administrator.',
      };
    }

    // Check if the assigned company is active
    let selected = companyId
      ? memberships.find((m) => m.companyId === companyId)
      : undefined;

    if (!selected && memberships.length === 1) {
      selected = memberships[0];
    }

    if (selected && !platform) {
      const { getCompanyById } = await import('@/lib/appwrite/tenant');
      const company = await getCompanyById(selected.companyId);
      if (!company || company.status === 'suspended' || company.status === 'archived') {
        try {
          await loginAccount.deleteSession(passwordSession.$id);
        } catch {}
        return {
          ok: false as const,
          error: 'Your assigned company has been suspended or deactivated. Please contact support.',
        };
      }
    }

    try {
      await loginAccount.deleteSession(passwordSession.$id);
    } catch {
      /* ignore */
    }

    await setSessionCookie(passwordSession.userId);

    if (selected) {
      await setCompanyCookie(selected.companyId);
      if (platform && safeNext.startsWith('/platform')) {
        redirect('/platform');
      }
      const home = tenantHomePath(selected.role);
      if (
        (safeNext === '/dashboard' || safeNext === '/') &&
        !isCompanyAdminRole(selected.role)
      ) {
        redirect(home);
      }
      redirect(safeNext);
    }

    if (platform) {
      redirect('/platform');
    }

    // Multi-membership: send to picker
    redirect('/select-company');
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { ok: false as const, error: toErrorMessage(error, 'Unable to sign in.') };
  }
}

export async function selectCompanyAction(formData: FormData) {
  const parsed = selectCompanySchema.safeParse({
    companyId: formData.get('companyId'),
  });
  if (!parsed.success) {
    redirect('/select-company');
  }

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = (await listMembershipsForUser(user.$id)).find(
    (m) => m.companyId === parsed.data.companyId,
  );
  if (!membership) {
    redirect('/select-company');
  }

  await setCompanyCookie(membership.companyId);
  redirect(tenantHomePath(membership.role));
}

export async function logoutAction() {
  const jar = await cookies();
  const secret = jar.get(SESSION_COOKIE)?.value;
  if (secret) {
    try {
      const { account } = createSessionClient(secret);
      await account.deleteSession('current');
    } catch {
      /* ignore */
    }
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(COMPANY_COOKIE);
  redirect('/login');
}

export async function platformProvisionCompanyAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = platformProvisionSchema.safeParse({
    companyName: formData.get('companyName'),
    slug: formData.get('slug'),
    adminName: formData.get('adminName'),
    adminEmail: formData.get('adminEmail'),
    adminPassword: formData.get('adminPassword'),
    plan: formData.get('plan') || 'free',
    maxEmployees: formData.get('maxEmployees') || 50,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const actor = await requirePlatformAdmin();

  try {
    const { users } = createAdminClient();
    const adminUser = await users.create(
      ID.unique(),
      data.adminEmail,
      undefined,
      data.adminPassword,
      data.adminName,
    );

    await provisionCompany({
      companyName: data.companyName,
      slug: data.slug,
      ownerUserId: adminUser.$id,
      ownerEmail: data.adminEmail,
      ownerName: data.adminName,
      actorUserId: actor.$id,
      plan: data.plan,
      maxEmployees: data.maxEmployees,
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: toErrorMessage(error, 'Unable to provision company.'),
    };
  }
}

export async function listCompaniesForPlatformAction(): Promise<Company[]> {
  await requirePlatformAdmin();
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    [Query.orderDesc('$createdAt'), Query.limit(100)],
  );
  return result.documents.map((d) =>
    mapCompany(d as unknown as Record<string, unknown>),
  );
}

export async function updateCompanyPlanAction(formData: FormData) {
  await requirePlatformAdmin();
  const actor = await requirePlatformAdmin();

  const parsed = updateCompanyPlanSchema.safeParse({
    companyId: formData.get('companyId'),
    plan: formData.get('plan'),
    maxEmployees: formData.get('maxEmployees'),
    status: formData.get('status'),
    payroll3pl: formData.get('payroll3pl') === 'on' || formData.get('payroll3pl') === 'true',
    geofencing: formData.get('geofencing') === 'on' || formData.get('geofencing') === 'true',
    selfiePunch: formData.get('selfiePunch') === 'on' || formData.get('selfiePunch') === 'true',
    sso: formData.get('sso') === 'on' || formData.get('sso') === 'true',
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const company = await getCompanyById(data.companyId);
  if (!company) return { ok: false as const, error: 'Company not found.' };

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
      action: 'company.plan_updated',
      entityType: 'company',
      entityId: company.id,
      meta: { plan: data.plan, status: data.status, featureFlags },
    });

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to update company.') };
  }
}

export async function updateTenantSettingsAction(formData: FormData) {
  const ctx = await requireCompanyAdmin();

  const parsed = updateCompanySettingsSchema.safeParse({
    timezone: formData.get('timezone'),
    currency: formData.get('currency'),
    workWeek: formData.get('workWeek'),
    jurisdictions: formData.get('jurisdictions'),
    departments: formData.get('departments') || '',
    designations: formData.get('designations') || '',
    logoUrl: formData.get('logoUrl') || '',
    primaryColor: formData.get('primaryColor') || '',
    emailSenderName: formData.get('emailSenderName') || '',
    employeeCodePrefix: formData.get('employeeCodePrefix') || '',
    employeeCodePadding: formData.get('employeeCodePadding') || 4,
    employeeCodeNextSequence: formData.get('employeeCodeNextSequence') || 1,
    employeeCodeAutoGenerate:
      formData.get('employeeCodeAutoGenerate') === 'on' ||
      formData.get('employeeCodeAutoGenerate') === 'true',
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid input.' };
  }

  const data = parsed.data;
  const workWeek = data.workWeek
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const jurisdictions = data.jurisdictions
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const departments = (data.departments || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const designations = (data.designations || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  const settings = {
    ...ctx.company.settings,
    timezone: data.timezone,
    currency: data.currency,
    workWeek: workWeek.length ? workWeek : ctx.company.settings.workWeek,
    jurisdictions: jurisdictions.length ? jurisdictions : ctx.company.settings.jurisdictions,
    departments,
    designations,
    employeeCodePrefix: data.employeeCodePrefix?.trim() || 'EMP',
    employeeCodePadding: data.employeeCodePadding ?? ctx.company.settings.employeeCodePadding ?? 4,
    employeeCodeNextSequence:
      data.employeeCodeNextSequence ?? ctx.company.settings.employeeCodeNextSequence ?? 1,
    employeeCodeAutoGenerate:
      data.employeeCodeAutoGenerate ?? ctx.company.settings.employeeCodeAutoGenerate ?? true,
  };

  const branding = {
    ...ctx.company.branding,
    logoUrl: data.logoUrl || ctx.company.branding.logoUrl,
    primaryColor: data.primaryColor || ctx.company.branding.primaryColor,
    emailSenderName: data.emailSenderName || ctx.company.branding.emailSenderName,
  };

  try {
    // Prefer session client so document permissions are enforced
    const secret = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!secret) redirect('/login');
    const { databases } = createSessionClient(secret);

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      ctx.company.id,
      {
        settings: JSON.stringify(settings),
        branding: JSON.stringify(branding),
      },
    );

    await writeAuditLog({
      companyId: ctx.company.id,
      teamId: ctx.company.teamId,
      actorUserId: ctx.user.$id,
      action: 'company.settings_updated',
      entityType: 'company',
      entityId: ctx.company.id,
      meta: { settings, branding },
    });

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toErrorMessage(error, 'Unable to save settings.') };
  }
}

export async function getTenantDashboardAction() {
  const ctx = await requireTenantMember();
  const { databases } = createAdminClient();

  const employees = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [
      Query.equal('companyId', ctx.company.id),
      Query.equal('status', 'active'),
      Query.limit(1),
    ],
  );

  return {
    company: ctx.company,
    membership: ctx.membership,
    user: { email: ctx.user.email, name: ctx.user.name, id: ctx.user.$id },
    employeeCount: employees.total,
  };
}

// Phase 1 server actions live in `@/lib/appwrite/phase1-actions`.
// Do not re-export them from this file — Turbopack treats the barrel as having no exports.