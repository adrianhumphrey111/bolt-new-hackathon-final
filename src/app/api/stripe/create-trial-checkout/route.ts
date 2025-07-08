import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { STRIPE_CONFIG } from '@/lib/stripe-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { email, successUrl, cancelUrl } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createClientSupabaseClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active subscription
    const { data: existingUser } = await supabase
      .from('users')
      .select('subscription_status, stripe_customer_id')
      .eq('id', session.user.id)
      .single();

    if (existingUser?.subscription_status === 'active' || existingUser?.subscription_status === 'trialing') {
      return NextResponse.json({ 
        error: 'You already have an active subscription or trial' 
      }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let customerId = existingUser?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: session.user.id
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    // Get the Pro plan price ID (we'll use the monthly price for the trial)
    const priceId = process.env.NODE_ENV === 'production' 
      ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID_TEST;

    // Create checkout session for trial
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: session.user.id,
        },
      },
      payment_method_collection: 'always', // Always collect payment method
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?trial_started=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?trial_cancelled=true`,
      metadata: {
        user_id: session.user.id,
        trial_signup: 'true',
      },
    });

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    });
  } catch (error: any) {
    console.error('Create trial checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}