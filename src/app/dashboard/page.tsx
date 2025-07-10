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
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .single()
  
  console.log('Dashboard profile check:', { 
    userId: user.id, 
    profile, 
    profileError,
    hasProfile: !!profile
  })
  
  // Check if user has a valid subscription (including trialing users)
  const hasValidSubscription = profile && (
    profile.subscription_tier === 'free' || // Grandfathered users
    profile.subscription_tier === 'pro' || // Paid subscribers
    profile.subscription_tier === 'creator' || // Paid subscribers
    !!profile.stripe_subscription_id || // Has any Stripe subscription (including trialing)
    profile.subscription_status === 'trialing' // Users currently on pro trial
  )
  
  console.log('Dashboard subscription check:', { 
    hasValidSubscription,
    subscription_tier: profile?.subscription_tier,
    stripe_subscription_id: profile?.stripe_subscription_id,
    subscription_status: profile?.subscription_status
  })
  
  // Only redirect to trial signup if user truly has no subscription at all
  if (!hasValidSubscription) {
    console.log('Redirecting to trial signup - no valid subscription found')
    redirect(`/auth/trial-signup?email=${encodeURIComponent(user.email || '')}`)
  }
  
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DashboardClient />
    </Suspense>
  )
}