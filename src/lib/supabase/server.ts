import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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

// Helper to get user from Authorization header and return authenticated client
export async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  
  if (!authorization?.startsWith('Bearer ')) {
    console.log('🔍 No authorization header found')
    return { user: null, error: 'No authorization header', supabase: null }
  }

  const token = authorization.replace('Bearer ', '')
  console.log('🔍 Token found, length:', token.length)
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.log('🔍 Auth error:', error?.message || 'No user found')
      return { user: null, error: error?.message || 'Invalid token', supabase: null }
    }

    console.log('🔍 User authenticated:', user.email)
    // Create an authenticated client for RLS
    const authenticatedSupabase = createAuthenticatedSupabaseClient(token)

    return { user, error: null, supabase: authenticatedSupabase }
  } catch (error) {
    console.log('🔍 Exception in getUserFromRequest:', error)
    return { user: null, error: 'Invalid token', supabase: null }
  }
}