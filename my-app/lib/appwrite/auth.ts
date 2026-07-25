import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Models } from 'node-appwrite';

import {
  COMPANY_COOKIE,
  SESSION_COOKIE,
  appwriteConfig,
} from '@/lib/appwrite/config';
import { createSessionClient } from '@/lib/appwrite/server';
import {
  getMembership,
  listMembershipsForUser,
  resolveActiveCompany,
} from '@/lib/appwrite/tenant';
import type { Company, EmployeeMembership } from '@/lib/appwrite/types';
import { isCompanyAdminRole } from '@/lib/appwrite/types';

export async function getSessionSecret() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  const secret = await getSessionSecret();
  if (!secret) return null;
  try {
    const { account } = createSessionClient(secret);
    return await account.get();
  } catch {
    return null;
  }
}

export function isPlatformAdminEmail(email: string) {
  const normalized = email.toLowerCase();
  return appwriteConfig.platformAdminEmails.includes(normalized);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!isPlatformAdminEmail(user.email || '')) {
    redirect('/dashboard');
  }
  return user;
}

export async function getCurrentTenantContext(): Promise<{
  user: Models.User<Models.Preferences>;
  company: Company;
  membership: EmployeeMembership;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const resolved = await resolveActiveCompany(user.$id);
  if (!resolved?.company || !resolved.membership) return null;
  if (resolved.membership.status !== 'active') return null;
  if (resolved.company.status === 'suspended') return null;

  return {
    user,
    company: resolved.company,
    membership: resolved.membership,
  };
}

export async function requireTenantMember(options?: { allowPasswordChange?: boolean }) {
  const ctx = await getCurrentTenantContext();
  if (!ctx) redirect('/login');
  if (ctx.membership.mustChangePassword && !options?.allowPasswordChange) {
    redirect('/change-password');
  }
  return ctx;
}

export async function requireCompanyAdmin() {
  const ctx = await requireTenantMember();
  if (!isCompanyAdminRole(ctx.membership.role)) {
    redirect('/dashboard');
  }
  return ctx;
}

/** @deprecated Use requireCompanyAdmin / requirePlatformAdmin */
export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (isPlatformAdminEmail(user.email || '')) return user;

  const memberships = await listMembershipsForUser(user.$id);
  const jar = await cookies();
  const companyId = jar.get(COMPANY_COOKIE)?.value;
  const membership = companyId
    ? memberships.find((m) => m.companyId === companyId)
    : memberships.find((m) => isCompanyAdminRole(m.role));

  if (membership && isCompanyAdminRole(membership.role)) return user;
  return null;
}

/** @deprecated Use requireCompanyAdmin */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');
  return admin;
}

export async function ensureMembershipOrRedirect(userId: string, companyId: string) {
  const membership = await getMembership(userId, companyId);
  if (!membership || membership.status !== 'active') {
    redirect('/login');
  }
  return membership;
}
