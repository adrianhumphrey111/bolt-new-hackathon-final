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
          
          // Get the user ID from customer metadata
          const customer = await stripe.customers.retrieve(customerId);
          if ('metadata' in customer && customer.metadata.userId) {
            const userId = customer.metadata.userId;
            
            // Update user profile with Stripe IDs
            await supabase
              .from('profiles')
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: 'active',
                subscription_tier: 'pro'
              })
              .eq('id', userId);

            // Initialize credits for new subscription
            await resetMonthlyCredits(userId);
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
        
        const customer = await stripe.customers.retrieve(customerId);
        if ('metadata' in customer && customer.metadata.userId) {
          const userId = customer.metadata.userId;
          
          // Update subscription status
          await supabase
            .from('profiles')
            .update({
              subscription_status: subscription.status
            })
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