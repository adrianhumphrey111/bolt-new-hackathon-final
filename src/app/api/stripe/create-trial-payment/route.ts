import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create Stripe customer for trial signup (no auth required)
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        trial_signup: 'true',
        signup_source: 'trial_paywall'
      }
    });

    // Create setup intent for trial (no immediate charge)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: {
        trial_signup: 'true',
        email: email,
      },
    });

    return NextResponse.json({ 
      clientSecret: setupIntent.client_secret,
      customerId: customer.id 
    });
  } catch (error: any) {
    console.error('Create trial payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}