import { cookies, headers } from 'next/headers';
import { Query } from 'node-appwrite';

import {
  COMPANY_COOKIE,
  COMPANY_SLUG_HEADER,
  appwriteConfig,
} from '@/lib/appwrite/config';
import { mapCompany, mapEmployee } from '@/lib/appwrite/mappers';
import { createAdminClient } from '@/lib/appwrite/server';
import type { Company, EmployeeMembership } from '@/lib/appwrite/types';

export function parseTenantSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  if (!hostname || appwriteConfig.apexHosts.includes(hostname)) {
    return null;
  }

  // acme.localhost → acme
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -'.localhost'.length);
    return slug && !slug.includes('.') ? slug : null;
  }

  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (!subdomain || subdomain === 'www') return null;
  return subdomain;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.companiesCollectionId,
    [Query.equal('slug', slug.toLowerCase()), Query.limit(1)],
  );
  if (result.total === 0) return null;
  return mapCompany(result.documents[0] as unknown as Record<string, unknown>);
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      companyId,
    );
    return mapCompany(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listMembershipsForUser(
  userId: string,
): Promise<EmployeeMembership[]> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [Query.equal('userId', userId), Query.equal('status', 'active'), Query.limit(100)],
  );
  return result.documents.map((d) =>
    mapEmployee(d as unknown as Record<string, unknown>),
  );
}

export async function getMembership(
  userId: string,
  companyId: string,
): Promise<EmployeeMembership | null> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.employeesCollectionId,
    [
      Query.equal('userId', userId),
      Query.equal('companyId', companyId),
      Query.limit(1),
    ],
  );
  if (result.total === 0) return null;
  return mapEmployee(result.documents[0] as unknown as Record<string, unknown>);
}

/**
 * Resolve active company from subdomain header, then company cookie.
 */
export async function resolveActiveCompany(
  userId?: string,
): Promise<{ company: Company; membership: EmployeeMembership | null } | null> {
  const h = await headers();
  const jar = await cookies();
  const slugHeader = h.get(COMPANY_SLUG_HEADER);
  const cookieCompanyId = jar.get(COMPANY_COOKIE)?.value;

  let company: Company | null = null;

  if (slugHeader) {
    company = await getCompanyBySlug(slugHeader);
  } else if (cookieCompanyId) {
    company = await getCompanyById(cookieCompanyId);
  }

  if (!company && userId) {
    const memberships = await listMembershipsForUser(userId);
    if (memberships.length === 1) {
      company = await getCompanyById(memberships[0].companyId);
    }
  }

  if (!company) return null;

  const membership = userId
    ? await getMembership(userId, company.id)
    : null;

  return { company, membership };
}
