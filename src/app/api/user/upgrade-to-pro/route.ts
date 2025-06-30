import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user to pro tier and reset credits
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.user_metadata?.preferred_username || user.email?.split('@')[0],
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        subscription_tier: 'pro',
        subscription_status: 'active',
        stripe_customer_id: 'dev_customer_' + user.id,
        stripe_subscription_id: 'dev_subscription_' + user.id,
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: 'Failed to upgrade to pro' }, { status: 500 });
    }

    // Reset user credits to pro tier amount (1000)
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: user.id,
        total_credits: 1000,
        used_credits: 0,
        last_reset: new Date().toISOString(),
      });

    if (creditsError) {
      console.error('Error updating credits:', creditsError);
      // Continue anyway, credits update is not critical
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to Pro!',
      subscription_tier: 'pro',
      subscription_status: 'active',
      credits: 1000
    });

  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}