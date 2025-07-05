import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/supabase/server'
import { createServiceSupabaseClient } from '../../../../lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    // Get the current user from authorization header
    const { user, error: authError } = await getUserFromRequest(request)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.email !== 'adrianhumphrey374@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service client for admin operations
    const supabase = createServiceSupabaseClient()

    // Get current date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get users active today (logged in today)
    const { count: activeToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', todayStart.toISOString())

    // Get users active this week
    const { count: activeThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', weekStart.toISOString())

    // Get users active this month
    const { count: activeThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', monthStart.toISOString())

    // Get new users today
    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    // Get new users this week
    const { count: newUsersThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())

    // Get new users this month
    const { count: newUsersThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())

    // Get recent logins (last 20 users with login activity)
    const { data: recentLogins } = await supabase
      .from('users')
      .select('email, last_sign_in_at, login_count')
      .not('last_sign_in_at', 'is', null)
      .order('last_sign_in_at', { ascending: false })
      .limit(20)

    // Format recent logins
    const formattedRecentLogins = recentLogins?.map(user => ({
      email: user.email,
      lastLogin: user.last_sign_in_at,
      loginCount: user.login_count || 0
    })) || []

    const analytics = {
      totalUsers: totalUsers || 0,
      activeToday: activeToday || 0,
      activeThisWeek: activeThisWeek || 0,
      activeThisMonth: activeThisMonth || 0,
      newUsersToday: newUsersToday || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      recentLogins: formattedRecentLogins
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}