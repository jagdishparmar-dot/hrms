import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getEmployeeTodayShifts } from '@/lib/appwrite/mobile-shifts';
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

    const schedule = await getEmployeeTodayShifts({
      membership: ctx.membership,
      company: ctx.company,
    });

    return withMobileCors(NextResponse.json({ ok: true, ...schedule }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load today\'s shift';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
