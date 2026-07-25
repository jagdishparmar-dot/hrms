import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  authenticateMobileUser,
  changeMobilePassword,
  withMobileCors,
} from '@/lib/appwrite/mobile-api';
import { changePasswordSchema } from '@/lib/schemas/phase1';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobileUser(request);
    if (!auth.ok) {
      return withMobileCors(
        NextResponse.json({ error: auth.error }, { status: auth.status }),
      );
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const secret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    await changeMobilePassword({
      userId: auth.user.$id,
      jwtOrSession: secret,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    return withMobileCors(NextResponse.json({ ok: true }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to change password';
    return withMobileCors(NextResponse.json({ error: message }, { status: 400 }));
  }
}
