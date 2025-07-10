import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import { resetMonthlyCredits } from '@/lib/credits';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { setupIntentId, billingFrequency } = await request.json();
    
    console.log('Subscription API called with:', { setupIntentId, billingFrequency });
    
    if (!setupIntentId) {
      return NextResponse.json({ error: 'Setup Intent ID is required' }, { status: 400 });
    }

    // Retrieve the setup intent
    console.log('Retrieving setup intent:', setupIntentId);
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    console.log('Setup intent retrieved:', {
      id: setupIntent.id,
      status: setupIntent.status,
      payment_method: setupIntent.payment_method,
      customer: setupIntent.customer
    });
    
    if (!setupIntent.payment_method) {
      console.error('No payment method found in setup intent');
      return NextResponse.json({ error: 'No payment method found' }, { status: 400 });
    }

    // Get email from metadata
    const email = setupIntent.metadata.email;
    console.log('Email from metadata:', email);
    
    // Get the Pro plan price ID using centralized config
    const priceId = billingFrequency === 'annual' 
      ? STRIPE_CONFIG.products.pro.prices.annual
      : STRIPE_CONFIG.products.pro.prices.monthly;

    console.log('Creating subscription with:', {
      customerId: setupIntent.customer,
      priceId,
      billingFrequency,
      environment: process.env.NODE_ENV
    });

    if (!priceId) {
      throw new Error(`Missing price ID for Pro ${billingFrequency} plan`);
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: setupIntent.customer as string,
      items: [{ price: priceId }],
      trial_period_days: 7,
      default_payment_method: setupIntent.payment_method as string,
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        trial_signup: 'true',
        email: email,
        billing_frequency: billingFrequency
      },
    });

    console.log('Subscription created:', {
      id: subscription.id,
      status: subscription.status,
      trial_end: subscription.trial_end
    });

    // Try to update user in database if they exist and are authenticated
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const { createServiceSupabaseClient } = await import('@/lib/supabase/service');
    
    // Use regular client to get authenticated user
    const userSupabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await userSupabase.auth.getUser();
    
    // Use service role client for database operations (bypasses RLS)
    const supabase = createServiceSupabaseClient();
    
    if (currentUser) {
      console.log('🔄 Updating user profile with subscription data:', {
        userId: currentUser.id,
        email: currentUser.email,
        subscriptionId: subscription.id
      });
      
      // User is authenticated, create or update their record with Pro status and trial info
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: currentUser.id,
          subscription_status: 'trialing',
          subscription_tier: 'pro', // Set as Pro user
          stripe_subscription_id: subscription.id,
          stripe_customer_id: setupIntent.customer as string,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          trial_started_at: new Date().toISOString(),
          has_completed_trial: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('❌ Error upserting user record:', upsertError);
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
      } else {
        console.log('✅ User record created/updated successfully');
        
        // Verify the update was successful
        const { data: updatedProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('subscription_tier, stripe_subscription_id, subscription_status')
          .eq('id', currentUser.id)
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching updated profile:', fetchError);
        } else {
          console.log('✅ Profile update verified:', updatedProfile);
        }
        
        // Set up Pro credits for trial user (5,000 credits per month)
        const proCredits = STRIPE_CONFIG.tiers.pro.credits;
        console.log('🔄 Setting up Pro trial credits:', proCredits);
        
        const creditsSuccess = await resetMonthlyCredits(currentUser.id, proCredits);
        if (creditsSuccess) {
          console.log('✅ Pro trial credits set up successfully');
        } else {
          console.error('❌ Failed to set up Pro trial credits');
        }
      }
    } else {
      console.log('⚠️ No authenticated user found - skipping profile update');
    }
    // If not authenticated, that's fine - the webhook will handle it when they sign in

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error: any) {
    console.error('Create trial subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}