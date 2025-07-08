import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Create an authenticated Supabase client with user's token
export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for server side without cookies
        },
      },
    }
  )
}

// Helper to get user from session cookies
export async function getUserFromRequest(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('🔍 No authenticated user found in session:', error?.message || 'No user')
      return { user: null, error: error?.message || 'No authenticated user', supabase: null }
    }

    console.log('🔍 User authenticated from session:', user.email)
    return { user, error: null, supabase }
  } catch (error) {
    console.log('🔍 Exception in getUserFromRequest:', error)
    return { user: null, error: 'Session error', supabase: null }
  }
}