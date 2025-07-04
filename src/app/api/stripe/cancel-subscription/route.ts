import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '../../../../lib/supabase/server';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cancelImmediately = false } = await request.json();

    console.log('🔍 Cancelling subscription for user:', user.id);

    // Get user's profile with Stripe subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No active subscription found' 
      }, { status: 400 });
    }

    console.log('🔍 Found subscription:', profile.stripe_subscription_id);

    // Cancel subscription in Stripe
    let subscription;
    if (cancelImmediately) {
      // Cancel immediately (refund prorated amount)
      subscription = await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      console.log('✅ Subscription cancelled immediately');
    } else {
      // Cancel at end of billing period (default behavior)
      subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      console.log('✅ Subscription set to cancel at period end');
    }

    // Update database
    const updateData = cancelImmediately ? {
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    } : {
      subscription_status: 'cancel_at_period_end',
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated successfully');

    // If cancelled immediately, reset credits to free tier
    if (cancelImmediately) {
      const { data: existingCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingCredits) {
        await supabase
          .from('user_credits')
          .update({
            total_credits: 100, // Free tier credits
            used_credits: Math.min(existingCredits.used_credits, 100), // Cap used credits
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
    }

    const periodEndDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const message = cancelImmediately 
      ? 'Your subscription has been cancelled immediately. You have been moved to the Free plan.'
      : `Your subscription will be cancelled at the end of your current billing period${periodEndDate ? ` (${periodEndDate.toLocaleDateString()})` : ''}. You'll keep your current benefits until then.`;

    return NextResponse.json({ 
      success: true,
      message,
      cancelledImmediately: cancelImmediately,
      periodEnd: periodEndDate ? periodEndDate.toISOString() : null,
      periodEndFormatted: periodEndDate ? periodEndDate.toLocaleDateString() : null
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}