import { AppwriteConfig } from '@/src/config/appwrite';
import { account } from '@/src/lib/appwrite';

export type CompanyMembership = {
  employeeId: string;
  companyId: string;
  companyName: string;
  mustChangePassword: boolean;
  role: string;
};

async function authHeaders(companyId?: string | null) {
  const jwt = await account.createJWT();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt.jwt}`,
    'Content-Type': 'application/json',
  };
  if (companyId) {
    headers['x-company-id'] = companyId;
  }
  return headers;
}

export async function fetchMemberships(): Promise<CompanyMembership[]> {
  const headers = await authHeaders();
  const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/memberships`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load companies');
  }
  return data.memberships as CompanyMembership[];
}

export async function changePasswordApi(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${AppwriteConfig.apiBaseUrl}/api/v1/auth/change-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to change password');
  }
}

export { authHeaders };
