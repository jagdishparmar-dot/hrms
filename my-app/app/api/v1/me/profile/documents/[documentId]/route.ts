import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  deleteEmployeeDocument,
  getEmployeeProfileSnapshot,
} from '@/lib/appwrite/employee-profile';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function DELETE(
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
    const result = await deleteEmployeeDocument({
      membership: ctx.membership,
      company: ctx.company,
      documentId,
      requesterUserId: ctx.user.$id,
      isAdmin: false,
    });

    if (!result.ok) {
      return withMobileCors(NextResponse.json({ error: result.error }, { status: 403 }));
    }

    const snapshot = await getEmployeeProfileSnapshot({
      membership: ctx.membership,
      company: ctx.company,
    });

    return withMobileCors(NextResponse.json({ ok: true, ...snapshot }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to delete document';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
