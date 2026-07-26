import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { listActiveShiftsForMobile } from '@/lib/appwrite/shift-change-requests';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';

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

    const shifts = await listActiveShiftsForMobile(ctx.membership.companyId);
    return withMobileCors(NextResponse.json({ ok: true, shifts }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Request failed';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
