import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login')
  }

  // Fetch projects with their videos
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
}