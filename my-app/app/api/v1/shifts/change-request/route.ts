import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  listActiveShiftsForMobile,
  listEmployeeShiftChangeRequests,
  submitShiftChangeRequest,
} from '@/lib/appwrite/shift-change-requests';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import { shiftChangeRequestSchema } from '@/lib/schemas/phase1';

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

    const requests = await listEmployeeShiftChangeRequests(ctx.membership);
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
    const parsed = shiftChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const result = await submitShiftChangeRequest({
      membership: ctx.membership,
      company: ctx.company,
      userId: ctx.user.$id,
      input: parsed.data,
    });

    if (!result.ok) {
      return withMobileCors(NextResponse.json({ error: result.error }, { status: 400 }));
    }

    return withMobileCors(NextResponse.json({ ok: true }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Request failed';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
