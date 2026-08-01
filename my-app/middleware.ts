import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  COMPANY_SLUG_HEADER,
  SESSION_COOKIE,
  appwriteConfig,
} from '@/lib/appwrite/config';

function parseTenantSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  if (!hostname || appwriteConfig.apexHosts.includes(hostname)) {
    return null;
  }

  if (hostname.endsWith('.localhost')) {
    const slug = hostname.slice(0, -'.localhost'.length);
    return slug && !slug.includes('.') ? slug : null;
  }

  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (!subdomain || subdomain === 'www') return null;
  return subdomain;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const host = request.headers.get('host') || '';
  const slug = parseTenantSlugFromHost(host);

  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set(COMPANY_SLUG_HEADER, slug);
  }

  const isPlatform = pathname.startsWith('/platform');
  const isTenantApp =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/me') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/sites') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/leave') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/shifts') ||
    pathname.startsWith('/change-password');

  if ((isTenantApp || isPlatform) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Do not redirect away from /login based on cookie presence alone.
  // Stale/invalid session cookies are cleared server-side in getCurrentUser().
  // The login page validates the session and routes authenticated users.

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/select-company',
    '/change-password',
    '/dashboard/:path*',
    '/me',
    '/me/:path*',
    '/settings/:path*',
    '/help/:path*',
    '/sites/:path*',
    '/employees/:path*',
    '/attendance/:path*',
    '/leave/:path*',
    '/payroll/:path*',
    '/shifts/:path*',
    '/platform/:path*',
  ],
};
