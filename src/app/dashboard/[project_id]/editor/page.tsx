import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { VideoEditor } from '../../../../components/VideoEditor'

interface EditorPageProps {
  params: {
    project_id: string
  }
}

export default async function EditorPage({ params }: EditorPageProps) {
  const cookieStore = cookies()
  const projectId = params.project_id
  
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