import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';
import { STRIPE_CONFIG } from '../../../../lib/stripe-config';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier = 'pro' } = await request.json();

    // Validate tier
    if (!['creator', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get credits for the tier
    const tierCredits = STRIPE_CONFIG.tiers[tier as keyof typeof STRIPE_CONFIG.tiers].credits;

    // Update user to specified tier and reset credits
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.user_metadata?.preferred_username || user.email?.split('@')[0],
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_customer_id: 'dev_customer_' + user.id,
        stripe_subscription_id: 'dev_subscription_' + user.id,
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: `Failed to upgrade to ${tier}` }, { status: 500 });
    }

    // Reset user credits to tier amount
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: user.id,
        total_credits: tierCredits,
        used_credits: 0,
        last_reset: new Date().toISOString(),
      });

    if (creditsError) {
      console.error('Error updating credits:', creditsError);
      // Continue anyway, credits update is not critical
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`,
      subscription_tier: tier,
      subscription_status: 'active',
      credits: tierCredits
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}