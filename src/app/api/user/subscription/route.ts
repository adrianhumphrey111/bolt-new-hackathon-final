import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock subscription data - replace with actual Stripe integration when needed
    const subscription = {
      id: 'sub_mock',
      plan: 'Professional',
      price: 29.99,
      period: 'month',
      status: 'active',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: 'cus_mock',
    };

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, paymentMethodId } = body;

    // TODO: Implement Stripe subscription creation
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: planId }],
    //   default_payment_method: paymentMethodId,
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Stripe subscription cancellation
    // await stripe.subscriptions.del(subscriptionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}