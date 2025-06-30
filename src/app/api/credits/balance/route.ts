import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';
import { getUserCredits } from '../../../../lib/credits';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await getUserCredits(user.id, supabase);

    // Get subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      credits,
      subscription: {
        status: profile?.subscription_status || 'none',
        tier: profile?.subscription_tier || 'free'
      }
    });

  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}