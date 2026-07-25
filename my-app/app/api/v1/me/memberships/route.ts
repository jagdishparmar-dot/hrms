import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  authenticateMobileUser,
  listMobileMemberships,
  withMobileCors,
} from '@/lib/appwrite/mobile-api';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileUser(request);
    if (!auth.ok) {
      return withMobileCors(
        NextResponse.json({ error: auth.error }, { status: auth.status }),
      );
    }

    const memberships = await listMobileMemberships(auth.user.$id);
    return withMobileCors(NextResponse.json({ ok: true, memberships }));
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Unable to load memberships';
    return withMobileCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
