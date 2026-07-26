import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { processPunch } from '@/lib/appwrite/attendance';
import { appwriteConfig } from '@/lib/appwrite/config';
import { resolveMobileContext, withMobileCors } from '@/lib/appwrite/mobile-api';
import { punchSchema } from '@/lib/schemas/phase1';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
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
    const parsed = punchSchema.safeParse(body);
    if (!parsed.success) {
      return withMobileCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const result = await processPunch({
      userId: ctx.user.$id,
      companyId: ctx.membership.companyId,
      employee: ctx.membership,
      type: parsed.data.type,
      lat: parsed.data.lat,
      long: parsed.data.long,
      accuracy: parsed.data.accuracy,
      deviceId: parsed.data.deviceId,
      timezone: ctx.company.settings.timezone || 'Asia/Kolkata',
      graceMinutes:
        ctx.company.settings.lateGraceMinutes ?? appwriteConfig.lateGraceMinutes,
    });

    return withMobileCors(
      NextResponse.json({
        ok: true,
        message: result.message,
        record: result.record,
      }),
    );
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Punch failed';
    const status =
      /outside geofence|already punched|punch in first|no active site|outside punch|punch-out window|punch-in window|shift date|self punch is disabled/i.test(
        message,
      )
        ? 400
        : 500;
    return withMobileCors(NextResponse.json({ error: message }, { status }));
  }
}
