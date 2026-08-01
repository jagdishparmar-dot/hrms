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
let authFailureHandler: (() => void | Promise<void>) | null = null;

export class SessionExpiredError extends Error {
  readonly status = 401;

  constructor(message = 'Session expired. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export function setAuthFailureHandler(handler: (() => void | Promise<void>) | null) {
  authFailureHandler = handler;
}

export function clearAuthCache() {
  cachedJwt = null;
  jwtInFlight = null;
}

async function notifyAuthFailure() {
  clearAuthCache();
  if (authFailureHandler) {
    await authFailureHandler();
  }
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
    try {
      const jwt = await account.createJWT();
      cachedJwt = {
        token: jwt.jwt,
        expiresAt: Date.now() + JWT_CACHE_TTL_MS,
      };
      return jwt.jwt;
    } catch {
      await notifyAuthFailure();
      throw new SessionExpiredError();
    }
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

export async function authHeaders(companyId?: string | null) {
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

export async function authorizedFetch(
  input: string,
  init: RequestInit & { companyId?: string | null } = {},
) {
  const { companyId, headers: initHeaders, ...rest } = init;
  const headers = await authHeaders(companyId);
  const res = await fetch(input, {
    ...rest,
    headers: {
      ...headers,
      ...(initHeaders as Record<string, string> | undefined),
    },
  });

  if (res.status === 401 || res.status === 403) {
    await notifyAuthFailure();
    throw new SessionExpiredError();
  }

  return res;
}

export async function fetchMemberships(): Promise<CompanyMembership[]> {
  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/me/memberships`);
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
  const res = await authorizedFetch(`${AppwriteConfig.apiBaseUrl}/api/v1/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to change password');
  }
}
