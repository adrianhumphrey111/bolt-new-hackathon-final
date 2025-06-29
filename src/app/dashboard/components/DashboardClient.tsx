'use client';

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { FaPlus, FaVideo, FaSignOutAlt } from 'react-icons/fa'
import NewProjectModal from './NewProjectModal'
import ProjectCard from './ProjectCard'

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
  user: any
}

export default function DashboardClient({ initialProjects, user }: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const openEditor = () => {
    // Navigate to editor without a specific project (general editor)
    router.push('/editor')
  }

  const refreshProjects = () => {
    // Refresh the page to get updated projects
    router.refresh()
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
              {user && (
                <span className="text-gray-400 text-sm">
                  Welcome, {user.email}
                </span>
              )}
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
          refreshProjects()
        }} 
      />
    </div>
  )
}