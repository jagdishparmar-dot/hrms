import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { appwriteConfig } from '@/lib/appwrite/config';
import { mapEmployeeDocument } from '@/lib/appwrite/mappers';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import { createAdminClient } from '@/lib/appwrite/server';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const { documentId } = await params;
    const { databases, client } = createAdminClient();
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeeDocumentsCollectionId,
      documentId,
    );
    const row = mapEmployeeDocument(doc as unknown as Record<string, unknown>);

    if (
      row.companyId !== ctx.company.id ||
      row.employeeId !== ctx.membership.id ||
      row.status !== 'active'
    ) {
      return withMobileCors(NextResponse.json({ error: 'Document not found.' }, { status: 404 }));
    }

    const { Storage } = await import('node-appwrite');
    const storage = new Storage(client);
    const buffer = await storage.getFileDownload(
      appwriteConfig.employeeDocumentsBucketId,
      row.fileId,
    );

    return withMobileCors(
      new Response(buffer, {
        headers: {
          'Content-Type': row.mimeType || 'application/octet-stream',
          'Cache-Control': 'private, max-age=300',
        },
      }),
    );
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load file';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
