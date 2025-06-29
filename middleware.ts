import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check auth condition
    if (session?.user) {
      // If the user is signed in and the current path is / or /auth/*,
      // redirect the user to /dashboard.
      if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth/')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      // Auth condition not met, redirect to login unless the path is / or /auth/*
      if (!request.nextUrl.pathname.startsWith('/auth/') && request.nextUrl.pathname !== '/') {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // If middleware fails, allow the request to continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/:path*', '/editor/:path*'],
}