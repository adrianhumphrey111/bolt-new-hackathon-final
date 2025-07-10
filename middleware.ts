import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if the current path requires subscription
  const path = request.nextUrl.pathname
  const isProtectedRoute = [
    '/dashboard',
    '/api/videos',
    '/api/render',
    '/api/export',
    '/api/user/usage/deduct',
  ].some(route => path.startsWith(route))

  // If user is accessing a protected route and is authenticated
  if (isProtectedRoute && user) {
    // Fetch user's subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    // Check if user needs to complete trial signup
    const needsTrial = profile && !profile.subscription_tier && !profile.stripe_subscription_id
    
    if (needsTrial) {
      // Redirect to trial signup page
      const url = request.nextUrl.clone()
      url.pathname = '/auth/trial-signup'
      return NextResponse.redirect(url)
    }
  }

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}