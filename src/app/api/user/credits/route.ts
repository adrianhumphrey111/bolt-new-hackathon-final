import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's credits
    const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .select('total_credits, used_credits')
      .eq('user_id', user.id)
      .single();

    if (creditError && creditError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching credits:', creditError);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    // Default to free tier credits if no record exists
    const credits = creditData ? {
      total: creditData.total_credits,
      used: creditData.used_credits,
      remaining: Math.max(0, creditData.total_credits - creditData.used_credits)
    } : {
      total: 100, // Free tier default
      used: 0,
      remaining: 100
    };

    return NextResponse.json(credits);

  } catch (error) {
    console.error('Credits fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}