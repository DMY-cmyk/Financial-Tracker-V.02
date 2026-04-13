import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'financial-tracker-secret-key-change-in-production'
);

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/health', '/api/cron'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, and Next.js internals
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: 'financial-tracker' });
    if (!payload.sub) {
      // Token missing subject claim — treat as unauthorized
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'expired');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth-token');
      return response;
    }
    // Forward user identity to API routes via request header (not response header)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Invalid or expired token
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
      response.cookies.delete('auth-token');
      return response;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'expired');
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
