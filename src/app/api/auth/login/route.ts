import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    // 🟢 Instead of NextResponse.next(), use the actual response we'll return
    const response = NextResponse.json({ success: true }) // temp, overwritten below

    // 🛠️ Create Supabase client with custom cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    // 🟢 Construct the final response and manually set auth cookies
    const finalResponse = NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session,
      },
      { status: 200 }
    )

    const { session } = data
    if (session) {
      finalResponse.cookies.set('sb-access-token', session.access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      })
      finalResponse.cookies.set('sb-refresh-token', session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      })
    }

    return finalResponse
  } catch (err) {
    console.error('Login failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
