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

export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json([]);
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    const defaultPaymentMethodId = typeof customer !== 'string' ? customer.invoice_settings?.default_payment_method : null;

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      card: pm.card,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      isDefault: pm.id === defaultPaymentMethodId
    }));

    return NextResponse.json(formattedMethods);

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: profile.stripe_customer_id,
    });

    // Optionally set as default payment method
    await stripe.customers.update(profile.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment method addition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}