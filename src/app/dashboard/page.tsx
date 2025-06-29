'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '../../../lib/supabase/client'
import DashboardClient from './components/DashboardClient'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Just fetch projects without auth check
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
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [supabase])

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

  // Mock user for now since we removed auth
  const mockUser = {
    email: 'demo@example.com',
    id: 'demo-user'
  }

  return (
    <DashboardClient 
      initialProjects={projects} 
      user={mockUser}
    />
  )
}