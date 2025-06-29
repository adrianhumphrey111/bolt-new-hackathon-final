import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is signed in and the current path is /auth/*, redirect the user to /
  if (session && request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return res
}

export const config = {
  matcher: ['/auth/:path*']
}