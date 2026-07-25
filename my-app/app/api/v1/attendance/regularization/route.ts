import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ID } from 'node-appwrite';

import { appwriteConfig } from '@/lib/appwrite/config';
import { employeeDocumentPermissions } from '@/lib/appwrite/permissions';
import { createAdminClient } from '@/lib/appwrite/server';
import {
  listMobileRegularizations,
  resolveMobileContext,
  withMobileCors,
} from '@/lib/appwrite/mobile-api';
import { regularizationSchema } from '@/lib/schemas/phase1';

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

    const requests = await listMobileRegularizations(ctx.membership);
    return withMobileCors(NextResponse.json({ ok: true, requests }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Request failed';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const body = await request.json();
    const parsed = regularizationSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const { databases } = createAdminClient();
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.regularizationsCollectionId,
      ID.unique(),
      {
        companyId: ctx.membership.companyId,
        employeeId: ctx.membership.id,
        userId: ctx.user.$id,
        dateIso: parsed.data.dateIso,
        reason: parsed.data.reason,
        requestedClockIn: parsed.data.requestedClockIn || '',
        requestedClockOut: parsed.data.requestedClockOut || '',
        requestedOutDateIso: parsed.data.requestedOutDateIso || '',
        status: 'pending',
        approverUserId: '',
        reviewNote: '',
      },
      employeeDocumentPermissions(ctx.membership.teamId),
    );

    return withMobileCors(NextResponse.json({ ok: true }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Request failed';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
