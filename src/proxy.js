import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('seapac_session')?.value;
  const { pathname } = request.nextUrl;

  // Define public paths that don't need auth
  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isNextInternal = pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname === '/favicon.ico';

  // Allow next internal assets, login page, and authentication APIs always
  if (isNextInternal || isAuthApi) {
    return NextResponse.next();
  }

  // If we have a session and try to access login, redirect to dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If we don't have a session and try to access anything else
  if (!session && !isLoginPage) {
    // If it's an API route, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }
    
    // Otherwise, redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Config to specify which paths the proxy runs on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
