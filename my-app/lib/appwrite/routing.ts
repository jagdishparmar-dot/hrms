import { isCompanyAdminRole, type TenantRole } from '@/lib/appwrite/types';

/** Default landing route after login for a tenant member. */
export function tenantHomePath(role: string) {
  return isCompanyAdminRole(role as TenantRole) ? '/dashboard' : '/me';
}

export function isEmployeePortalPath(pathname: string) {
  return pathname === '/me' || pathname.startsWith('/me/');
}
