import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  applyMobileLeave,
  getMobileLeaveSnapshot,
  resolveMobileContext,
  withMobileCors,
} from '@/lib/appwrite/mobile-api';
import { leaveRequestSchema } from '@/lib/schemas/phase1';

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

    const snapshot = await getMobileLeaveSnapshot(ctx.membership, ctx.company);
    return withMobileCors(NextResponse.json({ ok: true, ...snapshot }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load leave data';
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
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const result = await applyMobileLeave({
      membership: ctx.membership,
      company: ctx.company,
      leaveTypeId: parsed.data.leaveTypeId,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      note: parsed.data.note,
    });

    if (!result.ok) {
      return withMobileCors(NextResponse.json({ error: result.error }, { status: 400 }));
    }

    return withMobileCors(NextResponse.json({ ok: true }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to apply leave';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
