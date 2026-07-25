import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { appwriteConfig } from '@/lib/appwrite/config';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import { createAdminClient } from '@/lib/appwrite/server';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const { databases, client } = createAdminClient();
    const employeeDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      ctx.membership.id,
    );
    const fileId = String(employeeDoc.profilePictureFileId || '');
    if (!fileId) {
      return withMobileCors(NextResponse.json({ error: 'No profile picture.' }, { status: 404 }));
    }

    const { Storage } = await import('node-appwrite');
    const storage = new Storage(client);
    const buffer = await storage.getFileDownload(
      appwriteConfig.employeeDocumentsBucketId,
      fileId,
    );

    return withMobileCors(
      new Response(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, max-age=300',
        },
      }),
    );
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load profile picture';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
