import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Create initial response object
    let response = NextResponse.next()

    // Create Supabase client using request + response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Auth redirect logic
    const { pathname } = request.nextUrl

    if (session?.user) {
      if (pathname === '/' || pathname.startsWith('/auth/')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      if (!pathname.startsWith('/auth/') && pathname !== '/') {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('⚠️ Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/:path*', '/editor/:path*'],
}
