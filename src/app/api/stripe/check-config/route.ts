import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_CONFIG } from '@/lib/stripe-config';

export async function GET(request: NextRequest) {
  const config = {
    environment: process.env.NODE_ENV,
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripeConfig: {
      pro: {
        monthly: STRIPE_CONFIG.products.pro.prices.monthly,
        annual: STRIPE_CONFIG.products.pro.prices.annual,
      }
    },
    rawEnvVars: {
      STRIPE_PRO_MONTHLY_PRICE_ID_TEST: process.env.STRIPE_PRO_MONTHLY_PRICE_ID_TEST,
      STRIPE_PRO_ANNUAL_PRICE_ID_TEST: process.env.STRIPE_PRO_ANNUAL_PRICE_ID_TEST,
      STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      STRIPE_PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    }
  };

  return NextResponse.json(config);
}