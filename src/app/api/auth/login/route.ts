import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Validate request content type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    let email: string
    let password: string
    try {
      const body = await request.json()
      email = body.email?.trim()
      password = body.password

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Basic password validation
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
    } catch (e) {
      console.error('Error parsing request body:', e)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Attempt login
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Handle specific Supabase error cases
      switch (authError.message) {
        case 'Invalid login credentials':
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        case 'Email not confirmed':
          return NextResponse.json(
            { error: 'Please verify your email before logging in' },
            { status: 403 }
          )
        default:
          console.error('Supabase auth error:', authError)
          return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 401 }
          )
      }
    }

    // Successful login
    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    })

  } catch (error) {
    // Log the error for debugging but don't expose details to client
    console.error('Server error during login:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}