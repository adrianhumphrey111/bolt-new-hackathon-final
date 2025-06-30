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

// Helper to get user from Authorization header
export async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  
  if (!authorization?.startsWith('Bearer ')) {
    return { user: null, error: 'No authorization header' }
  }

  const token = authorization.replace('Bearer ', '')
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user, error }
  } catch (error) {
    return { user: null, error: 'Invalid token' }
  }
}