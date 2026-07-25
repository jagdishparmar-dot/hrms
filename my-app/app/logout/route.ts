import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, COMPANY_COOKIE } from '@/lib/appwrite/config';
import { createSessionClient } from '@/lib/appwrite/server';

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const secret = jar.get(SESSION_COOKIE)?.value;
  if (secret) {
    try {
      const { account } = createSessionClient(secret);
      await account.deleteSession('current');
    } catch {
      /* ignore */
    }
  }
  
  jar.delete(SESSION_COOKIE);
  jar.delete(COMPANY_COOKIE);

  const reason = request.nextUrl.searchParams.get('reason');
  const url = new URL('/login', request.url);
  
  if (reason === 'banned') {
    url.searchParams.set('error', 'Your assigned company has been suspended or deactivated. Please contact support.');
  } else if (reason === 'no-company') {
    url.searchParams.set('error', 'You are not assigned to any active company. Please contact support or your administrator.');
  }

  return NextResponse.redirect(url);
}
