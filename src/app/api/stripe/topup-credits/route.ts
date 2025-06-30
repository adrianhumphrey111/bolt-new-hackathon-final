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
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creditsAmount = 100 } = await request.json();

    // Validate credits amount (must be in increments of 100)
    if (creditsAmount % 100 !== 0 || creditsAmount < 100) {
      return NextResponse.json({ 
        error: 'Credits must be purchased in increments of 100' 
      }, { status: 400 });
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Get default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    });

    if (paymentMethods.data.length === 0) {
      // No payment method on file, create checkout session for one-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${creditsAmount} Credits`,
                description: 'AI Timeline Credits'
              },
              unit_amount: (creditsAmount / 100) * 1000, // $10 per 100 credits
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_purchased=${creditsAmount}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        metadata: {
          userId: user.id,
          creditsPurchased: creditsAmount.toString()
        }
      });

      return NextResponse.json({ 
        checkoutUrl: session.url 
      });
    } else {
      // Has payment method, charge immediately
      const amount = (creditsAmount / 100) * 1000; // $10 per 100 credits, in cents

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethods.data[0].id,
        off_session: true,
        confirm: true,
        metadata: {
          userId: user.id,
          creditsPurchased: creditsAmount.toString()
        }
      });

      return NextResponse.json({ 
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Error processing credit top-up:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'authentication_required') {
        return NextResponse.json(
          { error: 'Payment requires authentication', requiresAction: true },
          { status: 402 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process credit purchase' },
      { status: 500 }
    );
  }
}