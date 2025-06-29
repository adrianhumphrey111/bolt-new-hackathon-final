import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
import DashboardClient from './components/DashboardClient'

export default async function Dashboard() {
  try {
    const supabase = createSupabaseServerClient()

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