import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Account, Client, Query } from 'node-appwrite';

import { processPunch } from '@/lib/appwrite/attendance';
import { appwriteConfig } from '@/lib/appwrite/config';
import { mapCompany, mapEmployee } from '@/lib/appwrite/mappers';
import { createAdminClient } from '@/lib/appwrite/server';
import { punchSchema } from '@/lib/schemas/phase1';

function getBearer(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function withCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-company-id');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    const secret = getBearer(request);
    if (!secret) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    // Mobile sends Appwrite JWT from account.createJWT()
    if (secret.split('.').length === 3) {
      client.setJWT(secret);
    } else {
      client.setSession(secret);
    }
    const account = new Account(client);
    const user = await account.get();

    const body = await request.json();
    const parsed = punchSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Invalid payload' },
          { status: 400 },
        ),
      );
    }

    const { databases } = createAdminClient();
    const memberships = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.employeesCollectionId,
      [Query.equal('userId', user.$id), Query.equal('status', 'active'), Query.limit(20)],
    );
    if (memberships.total === 0) {
      return withCors(
        NextResponse.json({ error: 'No active employee membership' }, { status: 403 }),
      );
    }

    const companyHeader = request.headers.get('x-company-id');
    const membershipDoc =
      memberships.documents.find((d) => !companyHeader || d.companyId === companyHeader) ||
      memberships.documents[0];
    const membership = mapEmployee(membershipDoc as unknown as Record<string, unknown>);

    const companyDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.companiesCollectionId,
      membership.companyId,
    );
    const company = mapCompany(companyDoc as unknown as Record<string, unknown>);
    if (company.status === 'suspended') {
      return withCors(NextResponse.json({ error: 'Company suspended' }, { status: 403 }));
    }

    const result = await processPunch({
      userId: user.$id,
      companyId: membership.companyId,
      type: parsed.data.type,
      lat: parsed.data.lat,
      long: parsed.data.long,
      accuracy: parsed.data.accuracy,
      deviceId: parsed.data.deviceId,
      timezone: company.settings.timezone || 'Asia/Kolkata',
      graceMinutes:
        company.settings.lateGraceMinutes ?? appwriteConfig.lateGraceMinutes,
    });

    return withCors(
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
      /outside geofence|already punched|punch in first|no active site|outside punch|punch-out window|punch-in window|shift date/i.test(
        message,
      )
        ? 400
        : 500;
    return withCors(NextResponse.json({ error: message }, { status }));
  }
}
