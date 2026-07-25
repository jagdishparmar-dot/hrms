import { ID } from 'node-appwrite';

import { appwriteConfig } from '@/lib/appwrite/config';
import { auditLogDocumentPermissions } from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';

export async function writeAuditLog(input: {
  companyId?: string | null;
  teamId?: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { databases } = createAdminClient();
  // Tenant logs: team-readable. Platform logs (no team): admin-key only (empty perms).
  const permissions = auditLogDocumentPermissions(input.teamId ?? null);

  await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.auditLogsCollectionId,
    ID.unique(),
    {
      companyId: input.companyId || undefined,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || undefined,
      meta: JSON.stringify(input.meta || {}),
    },
    permissions,
  );
}
