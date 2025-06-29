import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simplified middleware - just handle basic redirects
  const { pathname } = request.nextUrl

  // Allow all requests to pass through
  // Auth will be handled client-side
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}