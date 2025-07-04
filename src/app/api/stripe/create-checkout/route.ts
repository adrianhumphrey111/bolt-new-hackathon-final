import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '../../../../lib/supabase/server';
import { STRIPE_CONFIG } from '../../../../lib/stripe-config';

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

    const { priceId, planTier, billingPeriod, creditsAmount, successUrl, cancelUrl, mode } = await request.json();

    console.log('🔍 Checkout request:', { priceId, planTier, billingPeriod, creditsAmount, mode });

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    request.headers.get('origin') || 
                    'https://your-domain.com';

    let finalPriceId = priceId;

    // If planTier and billingPeriod are provided, determine the price ID on the server
    if (planTier && billingPeriod && !priceId) {
      if (planTier === 'creator') {
        finalPriceId = billingPeriod === 'annual' 
          ? STRIPE_CONFIG.products.creator.prices.annual 
          : STRIPE_CONFIG.products.creator.prices.monthly;
      } else if (planTier === 'pro') {
        finalPriceId = billingPeriod === 'annual' 
          ? STRIPE_CONFIG.products.pro.prices.annual 
          : STRIPE_CONFIG.products.pro.prices.monthly;
      } else {
        return NextResponse.json({ 
          error: `Invalid plan tier: ${planTier}` 
        }, { status: 400 });
      }
    }

    // If creditsAmount is provided, determine the price ID for credit purchase
    if (creditsAmount && !priceId) {
      const topupConfig = STRIPE_CONFIG.topups[creditsAmount as keyof typeof STRIPE_CONFIG.topups];
      if (!topupConfig) {
        return NextResponse.json({ 
          error: `Invalid credit amount: ${creditsAmount}` 
        }, { status: 400 });
      }
      finalPriceId = topupConfig.priceId;
    }

    if (!finalPriceId) {
      return NextResponse.json({ 
        error: 'Price ID or plan information required' 
      }, { status: 400 });
    }

    console.log('🔍 Final price ID:', finalPriceId);

    // Validate price ID against our config
    const validPrices = [
      // Creator plan prices
      STRIPE_CONFIG.products.creator.prices.monthly,
      STRIPE_CONFIG.products.creator.prices.annual,
      // Pro plan prices
      STRIPE_CONFIG.products.pro.prices.monthly,
      STRIPE_CONFIG.products.pro.prices.annual,
      // Credit top-up prices
      ...Object.values(STRIPE_CONFIG.topups).map(topup => topup.priceId)
    ];

    if (!validPrices.includes(finalPriceId)) {
      console.log('❌ Invalid price ID:', finalPriceId);
      return NextResponse.json({ 
        error: `Invalid price ID: ${finalPriceId}. Valid prices: ${validPrices.join(', ')}` 
      }, { status: 400 });
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Check if customer has saved payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const hasPaymentMethod = paymentMethods.data.length > 0;
    console.log('🔍 Customer has payment methods:', hasPaymentMethod, paymentMethods.data.length);

    // If customer has saved payment methods and this is a subscription, create subscription directly
    if (hasPaymentMethod && mode === 'subscription') {
      try {
        // Get the default payment method or use the first one
        const customer = await stripe.customers.retrieve(customerId);
        let defaultPaymentMethodId = null;
        
        if (typeof customer !== 'string') {
          defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string;
        }
        
        const paymentMethodId = defaultPaymentMethodId || paymentMethods.data[0].id;

        console.log('🔍 Using payment method:', paymentMethodId);

        // Create subscription directly
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: finalPriceId }],
          default_payment_method: paymentMethodId,
          metadata: {
            userId: user.id
          }
        });

        console.log('✅ Subscription created:', subscription.id);

        return NextResponse.json({ 
          checkoutUrl: `${baseUrl}/settings?tab=subscription&success=true&subscription_id=${subscription.id}`,
          subscriptionId: subscription.id
        });

      } catch (error) {
        console.error('❌ Failed to create subscription directly:', error);
        // Fall back to checkout session if direct subscription creation fails
      }
    }

    // If customer has saved payment methods and this is a one-time payment, process payment directly
    if (hasPaymentMethod && mode === 'payment') {
      try {
        // Get the default payment method or use the first one
        const customer = await stripe.customers.retrieve(customerId);
        let defaultPaymentMethodId = null;
        
        if (typeof customer !== 'string') {
          defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string;
        }
        
        const paymentMethodId = defaultPaymentMethodId || paymentMethods.data[0].id;

        console.log('🔍 Using payment method for one-time payment:', paymentMethodId);

        // Get price details to determine amount
        const price = await stripe.prices.retrieve(finalPriceId);
        
        // Create payment intent directly
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price.unit_amount!,
          currency: price.currency,
          customer: customerId,
          payment_method: paymentMethodId,
          confirm: true,
          return_url: `${baseUrl}/settings?tab=subscription&success=true`,
          metadata: {
            userId: user.id,
            creditsAmount: creditsAmount?.toString() || 'unknown'
          }
        });

        console.log('✅ Payment intent created:', paymentIntent.id);

        return NextResponse.json({ 
          checkoutUrl: `${baseUrl}/settings?tab=subscription&success=true&payment_intent=${paymentIntent.id}`,
          paymentIntentId: paymentIntent.id
        });

      } catch (error) {
        console.error('❌ Failed to create payment directly:', error);
        // Fall back to checkout session if direct payment creation fails
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: mode || 'subscription',
      success_url: successUrl || `${baseUrl}/settings?tab=subscription&success=true`,
      cancel_url: cancelUrl || `${baseUrl}/settings?tab=subscription`,
      metadata: {
        userId: user.id
      }
    });

    return NextResponse.json({ 
      checkoutUrl: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}