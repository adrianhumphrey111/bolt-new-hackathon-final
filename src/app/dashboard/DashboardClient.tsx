'use client';

import { useEffect, useState, useRef } from 'react'
import { createClientSupabaseClient } from '../../lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaPlus, FaVideo, FaSignOutAlt, FaCog } from 'react-icons/fa'
import NewProjectModal from './components/NewProjectModal'
import ProjectCard from './components/ProjectCard'
import { useAuthContext } from '../../components/AuthProvider'
import TrialBanner from '../../components/TrialBanner'
import TrialPaywall from '../../components/TrialPaywall'
import { apiRequest } from '../../lib/api-client'

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
  const [userProfile, setUserProfile] = useState<any>(null)
  const { user, signOut, signIn, isAuthenticated, loading: authLoading, session } = useAuthContext()
  
  console.log('🏠 Dashboard render:', { isAuthenticated, hasUser: !!user, authLoading, loading })
  const supabase = createClientSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State to track demo login
  const [isDemoLogin, setIsDemoLogin] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showTrialPaywall, setShowTrialPaywall] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  

  // Check for demo parameter and impersonation flag on mount
  useEffect(() => {
    const demoParam = searchParams.get('demo')
    if (demoParam === 'bolthackathon') {
      setIsDemoLogin(true)
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
    if (!authLoading && !isAuthenticated && !isDemoLogin) {
      console.log('🔐 Redirecting to login - not authenticated')
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router, isDemoLogin])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProjects()
      fetchUserProfile()
    }
  }, [isAuthenticated, user])

  // Check if user needs to complete trial flow
  useEffect(() => {
    const trialStarted = searchParams.get('trial_started');
    console.log('🔍 Checking onboarding status:', { isAuthenticated, hasUser: !!user, userProfile, loading, trialStarted });
    
    // If user just completed trial, don't show paywall
    if (trialStarted === 'true') {
      console.log('✅ User just completed trial, skipping paywall check');
      setShowTrialPaywall(false);
      return;
    }
    
    if (isAuthenticated && user && !loading) {
      // Show trial paywall for users who:
      // 1. Don't have a profile record at all (brand new signups)
      // 2. Have a profile but no subscription_tier (new signups after migration)
      // 3. Have a profile but no stripe_subscription_id AND no subscription_tier (edge case)
      //
      // Don't show paywall for:
      // - Users with subscription_tier 'free' (grandfathered existing users)
      // - Users with stripe_subscription_id (completed trial flow)
      // - Users with subscription_tier 'pro', 'creator', etc. (paying customers)
      // - Users with subscription_status 'trialing' (currently on pro trial)
      const shouldShowTrialPaywall = !userProfile || 
        (!userProfile.stripe_subscription_id && !userProfile.subscription_tier && userProfile.subscription_status !== 'trialing');
      
      if (shouldShowTrialPaywall) {
        console.log('🔄 User needs to complete trial flow', { 
          userProfile, 
          hasProfile: !!userProfile, 
          hasStripeSubscription: !!userProfile?.stripe_subscription_id,
          subscriptionTier: userProfile?.subscription_tier 
        });
        setShowTrialPaywall(true);
      } else {
        console.log('✅ User has completed onboarding', { 
          userProfile, 
          hasStripeSubscription: !!userProfile?.stripe_subscription_id,
          subscriptionTier: userProfile?.subscription_tier 
        });
        setShowTrialPaywall(false);
      }
    } else if (!isAuthenticated && !authLoading) {
      setShowTrialPaywall(false);
    }
  }, [isAuthenticated, user, userProfile, loading, authLoading, searchParams])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileDropdown]);

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
      const data = await apiRequest('/api/projects');
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No user record exists yet - this is expected for new signups
          console.log('📝 No user record found, user needs to complete onboarding');
          setUserProfile(null);
        } else {
          console.error('Error fetching user profile:', error);
        }
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  const handleSignOut = async () => {
    try {
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

  // Handle profile actions
  const handleProfileAction = (action: string) => {
    setShowProfileDropdown(false);
    
    switch (action) {
      case 'settings':
        router.push('/settings');
        break;
      case 'logout':
        handleSignOut();
        break;
      default:
        break;
    }
  };

  const openEditor = () => {
    router.push('/editor')
  }

  if (authLoading || (!isAuthenticated || !user)) {
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

  if (loading || isDemoLogin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">
            {isDemoLogin ? 'Setting up demo...' : 'Loading projects...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Trial Paywall for new users */}
      {showTrialPaywall && (
        <TrialPaywall 
          userEmail={user?.email || ''}
          onClose={() => {
            setShowTrialPaywall(false);
            // Refresh user profile after trial completion
            fetchUserProfile();
          }}
        />
      )}
      
      <div className="min-h-screen bg-gray-900">
        {/* Trial Banner */}
        {userProfile?.subscription_status === 'trialing' && userProfile?.trial_ends_at && (
          <TrialBanner 
            trialEndsAt={userProfile.trial_ends_at}
            onUpgrade={() => router.push('/settings')}
          />
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
              {/* Profile Dropdown */}
              <div ref={profileDropdownRef} className="relative">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors group flex items-center space-x-2"
                  title="Profile & Settings"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {session?.user?.email?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-400 group-hover:text-white transition-all duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Profile Dropdown menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                    <div className="py-1">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                            {session?.user?.email?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || user?.email?.split('@')[0] || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {session?.user?.email || user?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => handleProfileAction('settings')}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-2.49-1.16-2.87 0a1.5 1.5 0 01-2.226 1.31c-1.06-.61-2.43.72-1.82 1.78a1.5 1.5 0 010 2.59c-.61 1.06.76 2.39 1.82 1.78a1.5 1.5 0 012.226 1.31c.38 1.16 2.49 1.16 2.87 0a1.5 1.5 0 012.226-1.31c1.06.61 2.43-.72 1.82-1.78a1.5 1.5 0 010-2.59c.61-1.06-.76-2.39-1.82-1.78a1.5 1.5 0 01-2.226-1.31zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span>Settings & Billing</span>
                        </button>

                        <div className="border-t border-gray-600 my-1"></div>

                        <button
                          onClick={() => handleProfileAction('logout')}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center space-x-3"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 01-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
    </>
  )
}