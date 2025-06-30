import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, credits } = await request.json();

    if (!action || !credits || credits <= 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Get or create user credits record
    const { data: existingCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('total_credits, used_credits')
      .eq('user_id', user.id)
      .single();

    let currentUsed = 0;
    let currentTotal = 100; // Default free tier

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching credits:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    if (existingCredits) {
      currentUsed = existingCredits.used_credits;
      currentTotal = existingCredits.total_credits;
    }

    // Check if user has enough credits
    const remaining = currentTotal - currentUsed;
    if (remaining < credits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: credits,
        available: remaining 
      }, { status: 402 });
    }

    // Update or insert credits record
    const newUsed = currentUsed + credits;
    
    if (existingCredits) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ used_credits: newUsed })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          total_credits: currentTotal,
          used_credits: newUsed
        });

      if (insertError) {
        console.error('Error creating credits record:', insertError);
        return NextResponse.json({ error: 'Failed to create credits record' }, { status: 500 });
      }
    }

    // Log the usage
    const { error: logError } = await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action,
        credits_used: credits,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('Failed to log usage:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      creditsDeducted: credits,
      remaining: currentTotal - newUsed
    });

  } catch (error) {
    console.error('Credit deduction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}