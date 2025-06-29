'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../../../lib/supabase/client'
import { VideoEditor } from '../../../../components/VideoEditor'

interface EditorPageProps {
  params: {
    project_id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()
  const projectId = params.project_id

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        // Verify project ownership
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', session.user.id)
          .single()

        if (error || !projectData) {
          console.error('Project access denied:', error)
          router.push('/dashboard')
          return
        }

        setAuthorized(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [projectId, supabase, router])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null // Will redirect
  }

  return (
    <div className="h-screen w-screen">
      <VideoEditor projectId={projectId} />
    </div>
  )
}