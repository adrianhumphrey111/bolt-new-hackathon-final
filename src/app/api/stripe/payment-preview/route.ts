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
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planTier, billingPeriod, creditsAmount, promotionCode } = await request.json();

    // Get user's Stripe customer ID and payment methods
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'No payment method found. Please add a payment method first.' 
      }, { status: 400 });
    }

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json({ 
        error: 'No payment method found. Please add a payment method first.' 
      }, { status: 400 });
    }

    // Get default payment method or use first one
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    let defaultPaymentMethodId = null;
    
    if (typeof customer !== 'string') {
      defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string;
    }
    
    const paymentMethod = paymentMethods.data.find(pm => pm.id === defaultPaymentMethodId) || paymentMethods.data[0];

    // Determine price ID and payment details
    let priceId: string;
    let paymentInfo: any;

    if (planTier && billingPeriod) {
      // Subscription payment
      if (planTier === 'creator') {
        priceId = billingPeriod === 'annual' 
          ? STRIPE_CONFIG.products.creator.prices.annual 
          : STRIPE_CONFIG.products.creator.prices.monthly;
      } else if (planTier === 'pro') {
        priceId = billingPeriod === 'annual' 
          ? STRIPE_CONFIG.products.pro.prices.annual 
          : STRIPE_CONFIG.products.pro.prices.monthly;
      } else {
        return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
      }

      const tierConfig = STRIPE_CONFIG.tiers[planTier as keyof typeof STRIPE_CONFIG.tiers];
      const price = billingPeriod === 'annual' ? tierConfig.annual_price : tierConfig.price;

      paymentInfo = {
        type: 'subscription',
        amount: price,
        planName: tierConfig.name,
        credits: tierConfig.credits,
        billingPeriod,
        priceId,
        planTier
      };
    } else if (creditsAmount) {
      // Credit purchase
      const topupConfig = STRIPE_CONFIG.topups[creditsAmount as keyof typeof STRIPE_CONFIG.topups];
      if (!topupConfig) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
      }

      paymentInfo = {
        type: 'credits',
        amount: topupConfig.price,
        credits: creditsAmount,
        priceId: topupConfig.priceId,
        creditsAmount
      };
    } else {
      return NextResponse.json({ error: 'Invalid payment request' }, { status: 400 });
    }

    // Add payment method info
    paymentInfo.cardLast4 = paymentMethod.card?.last4;
    paymentInfo.cardBrand = paymentMethod.card?.brand;
    paymentInfo.customerId = profile.stripe_customer_id;
    paymentInfo.paymentMethodId = paymentMethod.id;

    // Add discount information if promotion code is provided
    if (promotionCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCode,
          active: true,
          limit: 1
        });

        if (promotionCodes.data.length > 0) {
          const promoCode = promotionCodes.data[0];
          const coupon = promoCode.coupon;
          
          paymentInfo.discount = {
            percent_off: coupon.percent_off,
            amount_off: coupon.amount_off,
            promoCode: promotionCode
          };
        }
      } catch (error) {
        console.error('Error fetching promotion code for preview:', error);
        // Don't fail the preview if promo code lookup fails
      }
    }

    return NextResponse.json({ paymentInfo });

  } catch (error) {
    console.error('Error creating payment preview:', error);
    return NextResponse.json(
      { error: 'Failed to create payment preview' },
      { status: 500 }
    );
  }
}