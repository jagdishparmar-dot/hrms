import { AppwriteConfig } from '@/src/config/appwrite';
import { account } from '@/src/lib/appwrite';

export type CompanyMembership = {
  employeeId: string;
  companyId: string;
  companyName: string;
  mustChangePassword: boolean;
  role: string;
};

const JWT_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedJwt: { token: string; expiresAt: number } | null = null;
let jwtInFlight: Promise<string> | null = null;

export function clearAuthCache() {
  cachedJwt = null;
  jwtInFlight = null;
}

async function resolveJwtToken(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) {
    return cachedJwt.token;
  }

  if (jwtInFlight) {
    return jwtInFlight;
  }

  jwtInFlight = (async () => {
    const jwt = await account.createJWT();
    cachedJwt = {
      token: jwt.jwt,
      expiresAt: Date.now() + JWT_CACHE_TTL_MS,
    };
    return jwt.jwt;
  })();

  try {
    return await jwtInFlight;
  } finally {
    jwtInFlight = null;
  }
}

/** Prefetch JWT so punch requests skip an extra round-trip. */
export async function warmAuthHeaders(companyId?: string | null) {
  await authHeaders(companyId);
}

async function authHeaders(companyId?: string | null) {
  const token = await resolveJwtToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
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
