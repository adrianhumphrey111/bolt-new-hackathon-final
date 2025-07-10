import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface SubscriptionStatus {
  hasValidSubscription: boolean;
  isGrandfathered: boolean;
  needsTrial: boolean;
  subscriptionTier: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
}

export async function verifyUserSubscription(): Promise<SubscriptionStatus | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Check if user is grandfathered (has subscription_tier but no stripe_subscription_id)
  const isGrandfathered = profile.subscription_tier === 'free' && !profile.stripe_subscription_id;
  
  // Check if user has a valid subscription (either grandfathered, has stripe subscription, or is trialing)
  const hasValidSubscription = isGrandfathered || !!profile.stripe_subscription_id || profile.subscription_status === 'trialing';
  
  // User needs trial if they have neither subscription_tier nor stripe_subscription_id
  const needsTrial = !profile.subscription_tier && !profile.stripe_subscription_id;

  return {
    hasValidSubscription,
    isGrandfathered,
    needsTrial,
    subscriptionTier: profile.subscription_tier,
    stripeSubscriptionId: profile.stripe_subscription_id,
    subscriptionStatus: profile.subscription_status
  };
}

export function isProtectedRoute(pathname: string): boolean {
  // Define routes that require subscription
  const protectedRoutes = [
    '/dashboard',
    '/api/videos',
    '/api/render',
    '/api/export',
    '/api/user/usage/deduct',
  ];
  
  return protectedRoutes.some(route => pathname.startsWith(route));
}