import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    // Search for promotion codes with the given code
    const promotionCodes = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1
    });

    if (promotionCodes.data.length === 0) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or expired promo code' 
      }, { status: 404 });
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon;

    // Check if the promotion code has reached its usage limit
    if (promoCode.max_redemptions && promoCode.times_redeemed >= promoCode.max_redemptions) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This promo code has reached its usage limit' 
      }, { status: 400 });
    }

    // Return promotion code details
    return NextResponse.json({
      valid: true,
      promotion_code_id: promoCode.id,
      coupon_id: coupon.id,
      percent_off: coupon.percent_off,
      amount_off: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      name: coupon.name,
      valid: coupon.valid
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      { error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}