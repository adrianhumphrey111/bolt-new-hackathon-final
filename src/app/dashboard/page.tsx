'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase/client'
import DashboardClient from './components/DashboardClient'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth/login')
          return
        }

        setUser(session.user)

        // Fetch projects
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select(`*, videos (*)`)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching projects:', error)
        } else {
          setProjects(projectsData || [])
        }
      } catch (error) {
        console.error('Dashboard error:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <DashboardClient 
      initialProjects={projects} 
      user={user}
    />
  )
}