'use client';

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FaPlus, FaVideo, FaSignOutAlt } from 'react-icons/fa'
import NewProjectModal from './components/NewProjectModal'
import ProjectCard from './components/ProjectCard'
import type { User } from '@supabase/supabase-js'

interface Video {
  id: string
  file_name: string
  original_name: string
  file_path: string
  status: string
  created_at: string
}

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  videos?: Video[]
}

interface DashboardClientProps {
  initialProjects: Project[]
  user: User
}

export default function DashboardClient({ initialProjects, user }: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClientSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    // Subscribe to realtime changes
    const projectsSubscription = supabase
      .channel('projects_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
      }, () => {
        // Refresh projects when changes occur
        fetchProjects()
      })
      .subscribe()

    return () => {
      projectsSubscription.unsubscribe()
    }
  }, [supabase])

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          videos (*)
        `)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      // Call our logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        router.push('/auth/login')
        router.refresh()
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const openEditor = () => {
    router.push('/editor')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Remotion Video Editor
              </h1>
              <span className="text-gray-400 text-sm">
                Welcome, {user.email}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={openEditor}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaVideo />
                <span>Open Editor</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaPlus />
                <span>New Project</span>
              </button>
              <button
                onClick={handleSignOut}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaSignOutAlt />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div
            className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 transition-all duration-200 cursor-pointer p-12 text-center space-y-6"
            onClick={() => setIsModalOpen(true)}
          >
            <FaVideo className="w-16 h-16 text-blue-400 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Create Your First Project
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Upload your videos and let our timeline editor help you create something amazing
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto">
              <FaPlus />
              <span>New Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          // Refresh projects after modal closes
          fetchProjects()
        }} 
      />
    </div>
  )
}