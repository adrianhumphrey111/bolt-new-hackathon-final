import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardClient from './components/DashboardClient'

export default async function Dashboard() {
  try {
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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect('/auth/login')
    }

    // Fetch projects server-side
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        videos (*)
      `)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
    }

    return (
      <DashboardClient 
        initialProjects={projectsData || []} 
        user={session.user}
      />
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    // If there's any error, redirect to login
    redirect('/auth/login')
  }
}