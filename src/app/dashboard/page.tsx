import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

function DashboardLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  )
}

export default async function Dashboard() {
  // Server-side subscription check
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id')
    .eq('id', user.id)
    .single()
  
  // Check if user needs to complete trial signup
  const needsTrial = profile && !profile.subscription_tier && !profile.stripe_subscription_id
  
  if (needsTrial) {
    redirect(`/auth/trial-signup?email=${encodeURIComponent(user.email || '')}`)
  }
  
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DashboardClient />
    </Suspense>
  )
}