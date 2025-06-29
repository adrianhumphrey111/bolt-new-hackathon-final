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

    // Use fetch to call Supabase directly instead of the SDK
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // Direct API call to Supabase
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      // Handle specific Supabase error cases
      const errorMessage = authData.error_description || authData.message || 'Authentication failed'
      
      if (errorMessage.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
      if (errorMessage.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: 'Please verify your email before logging in' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }

    // Create response with session cookies
    const response = NextResponse.json({
      success: true,
      user: authData.user,
      session: authData,
    })

    // Set auth cookies manually
    if (authData.access_token) {
      response.cookies.set('sb-access-token', authData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authData.expires_in || 3600,
        path: '/',
      })
    }

    if (authData.refresh_token) {
      response.cookies.set('sb-refresh-token', authData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
    }

    return response

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