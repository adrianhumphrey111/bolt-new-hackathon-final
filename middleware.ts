import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check auth condition
  if (session?.user) {
    // If the user is signed in and the current path is / or /auth/*,
    // redirect the user to /dashboard.
    if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else {
    // Auth condition not met, redirect to login unless the path is / or /auth/*
    if (!request.nextUrl.pathname.startsWith('/auth/') && request.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/:path*', '/editor/:path*'],
};