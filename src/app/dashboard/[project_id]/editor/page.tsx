import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'
import { VideoEditor } from '../../../../components/VideoEditor'

interface EditorPageProps {
  params: {
    project_id: string
  }
}

export default async function EditorPage({ params }: EditorPageProps) {
  const projectId = params.project_id
  
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch project details and verify ownership
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', session.user.id) // Ensure user owns the project
    .single()

  if (projectError || !projectData) {
    console.error('Error fetching project:', projectError)
    // Project not found or user doesn't own it, redirect to dashboard
    redirect('/dashboard')
  }

  return (
    <div className="h-screen w-screen">
      <VideoEditor projectId={projectId} />
    </div>
  )
}