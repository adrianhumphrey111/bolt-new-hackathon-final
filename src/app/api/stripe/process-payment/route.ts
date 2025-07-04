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

    const { paymentInfo } = await request.json();

    console.log('🔍 Processing payment:', paymentInfo);

    if (paymentInfo.type === 'subscription') {
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: paymentInfo.customerId,
        items: [{ price: paymentInfo.priceId }],
        default_payment_method: paymentInfo.paymentMethodId,
        metadata: {
          userId: user.id,
          planTier: paymentInfo.planTier
        }
      });

      console.log('✅ Subscription created:', subscription.id);

      // Update user profile in database
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: paymentInfo.planTier,
          subscription_status: 'active',
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
      } else {
        console.log('✅ Profile updated successfully:', updateData);
      }

      // Update or create user credits record
      const { data: existingCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingCredits) {
        // Reset credits to the new plan's monthly allowance
        await supabase
          .from('user_credits')
          .update({
            total_credits: paymentInfo.credits,
            used_credits: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Create new credits record
        await supabase
          .from('user_credits')
          .insert({
            user_id: user.id,
            total_credits: paymentInfo.credits,
            used_credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return NextResponse.json({ 
        success: true,
        subscriptionId: subscription.id,
        message: `Successfully upgraded to ${paymentInfo.planName} plan!`
      });

    } else if (paymentInfo.type === 'credits') {
      // Process one-time payment for credits
      const price = await stripe.prices.retrieve(paymentInfo.priceId);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price.unit_amount!,
        currency: price.currency,
        customer: paymentInfo.customerId,
        payment_method: paymentInfo.paymentMethodId,
        confirm: true,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
        metadata: {
          userId: user.id,
          creditsAmount: paymentInfo.creditsAmount.toString()
        }
      });

      console.log('✅ Payment intent created:', paymentIntent.id);

      // Add credits to user's account
      const { data: existingCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingCredits) {
        // Add to existing credits
        await supabase
          .from('user_credits')
          .update({
            total_credits: existingCredits.total_credits + paymentInfo.creditsAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Create new credits record
        await supabase
          .from('user_credits')
          .insert({
            user_id: user.id,
            total_credits: paymentInfo.creditsAmount,
            used_credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return NextResponse.json({ 
        success: true,
        paymentIntentId: paymentIntent.id,
        message: `Successfully added ${paymentInfo.creditsAmount.toLocaleString()} credits to your account!`
      });
    }

    return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}