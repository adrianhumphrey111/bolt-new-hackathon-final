'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { FaUsers, FaChartLine, FaSignOutAlt, FaHome, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaLink } from 'react-icons/fa'
import { ReprocessVideosButton } from './ReprocessVideosButton'
import { UTMTrackingGenerator } from '../UTMTrackingGenerator'

interface UserAnalytics {
  totalUsers: number
  activeToday: number
  activeThisWeek: number
  activeThisMonth: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  recentLogins: Array<{
    email: string
    lastLogin: string
    loginCount: number
  }>
}

export function AdminDashboard() {
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.email === 'adrianhumphrey374@gmail.com'
  
  // Debug logging
  useEffect(() => {
    console.log('Admin Dashboard Auth Check:', {
      authLoading,
      isAuthenticated,
      userEmail: user?.email,
      isAdmin
    })
  }, [authLoading, isAuthenticated, user?.email, isAdmin])

  useEffect(() => {
    // Wait for auth to be checked
    if (authLoading) return

    // Only fetch analytics if user is admin (no redirects)
    if (isAdmin) {
      console.log('User is admin, fetching analytics')
      fetchAnalytics()
    }
  }, [isAuthenticated, isAdmin, authLoading, router])

  const fetchAnalytics = async () => {
    try {
      // Get the current session to include in the request
      const { createClientSupabaseClient } = await import('../../lib/supabase/client')
      const supabase = createClientSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/admin/analytics', { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const result = await signOut()
      if (result.success) {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  // Show loading only while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show access denied only if not admin email
  if (!authLoading && user?.email !== 'adrianhumphrey374@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to view this page.</p>
          <p className="text-sm text-gray-500">Current user: {user?.email || 'Not logged in'}</p>
        </div>
      </div>
    )
  }
  
  // Show loading while fetching analytics (only after auth is confirmed)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Error</h1>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <span className="text-gray-400 text-sm">
                Welcome, {user.email}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <FaHome />
                <span>Dashboard</span>
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
        {analytics && (
          <div className="space-y-8">
            {/* Reprocess Videos Section */}
            <ReprocessVideosButton />
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
                  </div>
                  <FaUsers className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Today</p>
                    <p className="text-2xl font-bold text-green-400">{analytics.activeToday}</p>
                  </div>
                  <FaCalendarDay className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active This Week</p>
                    <p className="text-2xl font-bold text-yellow-400">{analytics.activeThisWeek}</p>
                  </div>
                  <FaCalendarWeek className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active This Month</p>
                    <p className="text-2xl font-bold text-purple-400">{analytics.activeThisMonth}</p>
                  </div>
                  <FaCalendarAlt className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* New Users Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">New Users Today</p>
                    <p className="text-2xl font-bold text-green-400">{analytics.newUsersToday}</p>
                  </div>
                  <FaChartLine className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">New Users This Week</p>
                    <p className="text-2xl font-bold text-yellow-400">{analytics.newUsersThisWeek}</p>
                  </div>
                  <FaChartLine className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">New Users This Month</p>
                    <p className="text-2xl font-bold text-purple-400">{analytics.newUsersThisMonth}</p>
                  </div>
                  <FaChartLine className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Recent Logins Table */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Recent User Activity</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3 px-4">User Email</th>
                      <th className="text-left text-gray-400 pb-3 px-4">Last Login</th>
                      <th className="text-left text-gray-400 pb-3 px-4">Total Logins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentLogins.map((login, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-white">{login.email}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(login.lastLogin).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{login.loginCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* UTM Tracking Generator */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center mb-6">
                <FaLink className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-xl font-bold text-white">UTM Tracking Generator</h2>
              </div>
              <UTMTrackingGenerator />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}