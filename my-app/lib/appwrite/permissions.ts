import { Permission, Role } from 'node-appwrite';

import type { TenantRole } from '@/lib/appwrite/types';

/** Document readable by any member of the company team. */
export function teamRead(teamId: string) {
  return Permission.read(Role.team(teamId));
}

/** Document writable by company_admin team role. */
export function teamAdminUpdate(teamId: string) {
  return Permission.update(Role.team(teamId, 'company_admin'));
}

export function teamAdminDelete(teamId: string) {
  return Permission.delete(Role.team(teamId, 'company_admin'));
}

/** Company document permissions for members + admin updates. */
export function companyDocumentPermissions(teamId: string) {
  return [teamRead(teamId), teamAdminUpdate(teamId), teamAdminDelete(teamId)];
}

/** Employee row: team can read; company_admin can update/delete. */
export function employeeDocumentPermissions(teamId: string) {
  return [teamRead(teamId), teamAdminUpdate(teamId), teamAdminDelete(teamId)];
}

/** Audit logs: team members can read; only server/admin client creates. */
export function auditLogDocumentPermissions(teamId: string | null) {
  if (!teamId) return [];
  return [teamRead(teamId), Permission.read(Role.team(teamId, 'company_admin'))];
}

export function appwriteTeamRole(role: TenantRole): string {
  return role;
}
