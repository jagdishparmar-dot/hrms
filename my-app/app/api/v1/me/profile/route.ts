import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getEmployeeProfileSnapshot,
  updateEmployeeSelfProfile,
} from '@/lib/appwrite/employee-profile';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import { employeeSelfUpdateSchema } from '@/lib/schemas/employee-profile';

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

    const snapshot = await getEmployeeProfileSnapshot({
      membership: ctx.membership,
      company: ctx.company,
    });

    return withMobileCors(NextResponse.json({ ok: true, ...snapshot }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load profile';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await resolveMobileContext(request);
    if (!ctx.ok) {
      return withMobileCors(
        NextResponse.json({ error: ctx.error }, { status: ctx.status }),
      );
    }

    const body = await request.json();
    const parsed = employeeSelfUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const result = await updateEmployeeSelfProfile({
      membership: ctx.membership,
      company: ctx.company,
      input: parsed.data,
    });

    if (!result.ok) {
      return withMobileCors(NextResponse.json({ error: result.error }, { status: 400 }));
    }

    const snapshot = await getEmployeeProfileSnapshot({
      membership: result.employee,
      company: ctx.company,
    });

    return withMobileCors(NextResponse.json({ ok: true, ...snapshot }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to update profile';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
