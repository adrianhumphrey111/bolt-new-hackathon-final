import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { addCredits, resetMonthlyCredits } from '../../../../lib/credits';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          // New subscription created
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          
          // Get the subscription details to check if it's a trial
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const isTrialing = subscription.status === 'trialing';
          
          // Get the user ID from session metadata or customer metadata
          const userId = session.metadata?.user_id || session.metadata?.supabase_user_id;
          
          if (!userId) {
            // Fallback to customer metadata
            const customer = await stripe.customers.retrieve(customerId);
            if ('metadata' in customer && customer.metadata.supabase_user_id) {
              const userId = customer.metadata.supabase_user_id;
            }
          }
          
          if (userId) {
            // Determine subscription tier based on price
            const priceId = subscription.items.data[0]?.price.id;
            let subscriptionTier = 'creator';
            let monthlyCredits = 1000;
            
            // Check if it's Pro plan based on price ID
            if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 
                priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID ||
                priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID_TEST ||
                priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID_TEST) {
              subscriptionTier = 'pro';
              monthlyCredits = 5000;
            }
            
            // Update user profile with Stripe IDs and trial info
            const updateData: any = {
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: isTrialing ? 'trialing' : 'active',
              subscription_tier: subscriptionTier
            };
            
            // If it's a trial, set trial dates
            if (isTrialing && subscription.trial_end) {
              updateData.trial_started_at = new Date().toISOString();
              updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
            }
            
            await supabase
              .from('users')
              .update(updateData)
              .eq('id', userId);

            // Initialize credits for new subscription (even if trialing)
            await resetMonthlyCredits(userId, monthlyCredits);
          }
        }
        
        // Handle payment link completion for annual subscriptions
        if (session.mode === 'payment' && session.metadata) {
          const { plan, user_id, discount, discounted_price, original_price } = session.metadata;
          
          if (user_id && plan) {
            try {
              // Determine subscription tier based on plan
              let subscriptionTier = 'pro';
              let monthlyCredits = 5000; // Default for pro_annual
              
              if (plan.includes('creator')) {
                subscriptionTier = 'creator';
                monthlyCredits = 1000;
              }
              
              // Update user profile with subscription details
              await supabase
                .from('profiles')
                .update({
                  stripe_customer_id: session.customer as string,
                  subscription_status: 'active',
                  subscription_tier: subscriptionTier
                })
                .eq('id', user_id);

              // Initialize credits for the annual subscription
              await resetMonthlyCredits(user_id, monthlyCredits);
              
              // Log the payment details
              console.log(`Payment link completed for user ${user_id}:`, {
                plan,
                originalPrice: original_price,
                discountedPrice: discounted_price,
                discount,
                sessionId: session.id
              });
              
            } catch (error) {
              console.error('Error processing payment link completion:', error);
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Check if this is a subscription renewal (not the first payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if ('metadata' in customer && customer.metadata.userId) {
            const userId = customer.metadata.userId;
            
            // Reset monthly credits on subscription renewal
            await resetMonthlyCredits(userId);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a credit top-up
        if (paymentIntent.metadata.creditsPurchased) {
          const userId = paymentIntent.metadata.userId;
          const creditsPurchased = parseInt(paymentIntent.metadata.creditsPurchased);
          const amountPaid = paymentIntent.amount / 100; // Convert from cents
          
          if (userId && creditsPurchased) {
            await addCredits(
              userId,
              creditsPurchased,
              'topup',
              paymentIntent.id,
              amountPaid
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        if ('metadata' in customer && customer.metadata.userId) {
          const userId = customer.metadata.userId;
          
          // Update user profile to reflect cancelled subscription
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
              subscription_tier: 'free'
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get user ID from subscription metadata
        const userId = subscription.metadata?.supabase_user_id;
        
        if (!userId) {
          // Fallback to customer metadata
          const customer = await stripe.customers.retrieve(customerId);
          if ('metadata' in customer && customer.metadata.supabase_user_id) {
            const userId = customer.metadata.supabase_user_id;
          }
        }
        
        if (userId) {
          const updateData: any = {
            subscription_status: subscription.status
          };
          
          // Check if trial just ended (status changed from trialing to active)
          const previousStatus = (event.data.previous_attributes as any)?.status;
          if (previousStatus === 'trialing' && subscription.status === 'active') {
            updateData.has_completed_trial = true;
            console.log(`Trial ended for user ${userId}, subscription now active`);
          }
          
          // Update subscription status
          await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}