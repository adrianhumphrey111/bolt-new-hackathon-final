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

    // Check if customer already exists with this email
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      // Use existing customer
      customer = existingCustomers.data[0];
      console.log(`Found existing customer ${customer.id} for email ${email}`);
    } else {
      // Create new customer for trial signup
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          trial_signup: 'true',
          signup_source: 'trial_paywall'
        }
      });
      console.log(`Created new customer ${customer.id} for email ${email}`);
    }

    // Create setup intent for trial (no immediate charge)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: {
        trial_signup: 'true',
        email: email,
        created_at: new Date().toISOString(),
      },
    });
    
    console.log(`Created setup intent ${setupIntent.id} for customer ${customer.id}`);
    console.log(`Trial signup initiated for email: ${email} at ${new Date().toISOString()}`);

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