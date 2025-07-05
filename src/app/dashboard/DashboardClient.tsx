'use client';

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '../../lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaPlus, FaVideo, FaSignOutAlt, FaCog } from 'react-icons/fa'
import NewProjectModal from './components/NewProjectModal'
import ProjectCard from './components/ProjectCard'
import { useAuthContext } from '../../components/AuthProvider'

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

export default function DashboardClient() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user, signOut, signIn, isAuthenticated, loading: authLoading } = useAuthContext()
  
  console.log('🏠 Dashboard render:', { isAuthenticated, hasUser: !!user, authLoading, loading })
  const supabase = createClientSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State to track demo login
  const [isDemoLogin, setIsDemoLogin] = useState(false)
  
  // State to track impersonation
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Check for demo parameter and impersonation flag on mount
  useEffect(() => {
    const demoParam = searchParams.get('demo')
    if (demoParam === 'bolthackathon') {
      setIsDemoLogin(true)
    }
    
    // Check if we're impersonating
    const impersonatingFlag = sessionStorage.getItem('isImpersonating')
    if (impersonatingFlag === 'true') {
      setIsImpersonating(true)
      console.log('🎭 Impersonation mode detected')
    }
  }, [searchParams])

  // Handle demo login
  useEffect(() => {
    if (isDemoLogin && !isAuthenticated && !authLoading) {
      console.log('🎬 Demo login detected, attempting login...')
      const handleDemoLogin = async () => {
        try {
          const result = await signIn('adrianhumphrey374@gmail.com', 'Jesus374!')
          if (result.success) {
            console.log('✅ Demo login successful')
            // Remove the demo parameter from URL without reloading
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('demo')
            window.history.replaceState({}, '', newUrl.toString())
            setIsDemoLogin(false)
          } else {
            console.error('Demo login failed:', result.error)
            setIsDemoLogin(false)
          }
        } catch (error) {
          console.error('Demo login error:', error)
          setIsDemoLogin(false)
        }
      }
      handleDemoLogin()
    }
  }, [isDemoLogin, isAuthenticated, authLoading, signIn])

  // Redirect if not authenticated (but not during demo login or impersonation)
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isDemoLogin && !isImpersonating) {
      console.log('🔐 Redirecting to login - not authenticated')
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router, isDemoLogin, isImpersonating])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProjects()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated || !user) return

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
  }, [supabase, isAuthenticated, user])

  const fetchProjects = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/projects', { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const { projects: projectsData } = await response.json();
      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Clear impersonation flag
      sessionStorage.removeItem('isImpersonating')
      
      const result = await signOut()
      if (result.success) {
        router.push('/auth/login')
      } else {
        console.error('Logout failed:', result.error)
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }
  
  const handleStopImpersonating = () => {
    sessionStorage.removeItem('isImpersonating')
    setIsImpersonating(false)
    window.location.href = '/auth/login'
  }

  const openEditor = () => {
    router.push('/editor')
  }

  if (authLoading || (!isAuthenticated || !user) && !isImpersonating) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">
            {authLoading ? 'Checking authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (loading || isDemoLogin || (isImpersonating && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">
            {isDemoLogin ? 'Setting up demo...' : 
             isImpersonating ? 'Setting up impersonation...' : 
             'Loading projects...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm font-medium">
          🎭 Impersonation Mode - You are viewing as {user?.email}
          <button
            onClick={handleStopImpersonating}
            className="ml-4 bg-orange-700 hover:bg-orange-800 px-3 py-1 rounded text-xs"
          >
            Stop Impersonating
          </button>
        </div>
      )}
      
      {/* Top Navigation */}
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Tailored Labs
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
                onClick={() => router.push('/settings')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaCog />
                <span>Settings</span>
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