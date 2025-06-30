import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClientSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: (key: string) => {
              if (typeof window === 'undefined') return null
              return window.localStorage.getItem(key)
            },
            setItem: (key: string, value: string) => {
              if (typeof window === 'undefined') return
              window.localStorage.setItem(key, value)
            },
            removeItem: (key: string) => {
              if (typeof window === 'undefined') return
              window.localStorage.removeItem(key)
            },
          },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return supabaseClient
}

// Helper function to get current user
export async function getCurrentUser() {
  const supabase = createClientSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Helper function to get current session
export async function getCurrentSession() {
  const supabase = createClientSupabaseClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}