import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  COMPANY_COOKIE,
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

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/select-company');

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

  if (isAuthRoute && session && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    const hasCompany = Boolean(request.cookies.get(COMPANY_COOKIE)?.value);
    url.pathname = hasCompany ? '/dashboard' : '/select-company';
    return NextResponse.redirect(url);
  }

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
