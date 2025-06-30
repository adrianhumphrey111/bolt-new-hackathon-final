import { createServerSupabaseClient } from '@/lib/supabase/server'
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
    let confirmPassword: string
    try {
      const body = await request.json()
      email = body.email?.trim()
      password = body.password
      confirmPassword = body.confirmPassword

      if (!email || !password || !confirmPassword) {
        return NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        )
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Passwords do not match' },
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

    // Initialize Supabase client with server-side cookie handling
    const supabase = createServerSupabaseClient()

    // Attempt signup
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (authError) {
      console.error('Supabase signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Successful signup
    return NextResponse.json({
      success: true,
      message: 'Check your email for the confirmation link!',
      user: data.user,
    })

  } catch (error) {
    // Log the error for debugging but don't expose details to client
    console.error('Server error during signup:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}