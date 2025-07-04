import { createServerSupabaseClient, getUserFromRequest } from './supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_CONFIG } from './stripe-config';

export type ActionType = 'video_upload' | 'ai_generate' | 'ai_chat';

export interface CreditCheckResult {
  canProceed: boolean;
  creditsRequired: number;
  creditsAvailable: number;
  error?: string;
}

export async function checkCredits(
  userId: string,
  action: ActionType,
  supabase: any
): Promise<CreditCheckResult> {
  const creditsRequired = STRIPE_CONFIG.credits.costs[action];
  
  try {
    // Get user's remaining credits using the SQL function
    const { data, error } = await supabase
      .rpc('get_remaining_credits', { p_user_id: userId });

    if (error) {
      console.error('Error checking credits:', error);
      return {
        canProceed: false,
        creditsRequired,
        creditsAvailable: 0,
        error: 'Failed to check credits'
      };
    }

    const creditsAvailable = data || 0;

    return {
      canProceed: creditsAvailable >= creditsRequired,
      creditsRequired,
      creditsAvailable,
      error: creditsAvailable < creditsRequired ? 'Insufficient credits' : undefined
    };
  } catch (error) {
    console.error('Error in checkCredits:', error);
    return {
      canProceed: false,
      creditsRequired,
      creditsAvailable: 0,
      error: 'Failed to check credits'
    };
  }
}

export async function useCredits(
  userId: string,
  action: ActionType,
  metadata: any,
  supabase: any
): Promise<boolean> {
  const creditsToUse = STRIPE_CONFIG.credits.costs[action];
  
  try {
    const { data, error } = await supabase
      .rpc('use_credits', {
        p_user_id: userId,
        p_action_type: action,
        p_credits_amount: creditsToUse,
        p_metadata: metadata
      });

    if (error) {
      console.error('Error using credits:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in useCredits:', error);
    return false;
  }
}

export async function getUserCredits(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('total_credits, used_credits, reset_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No credits record exists yet
        return {
          total: 0,
          used: 0,
          available: 0,
          resetDate: null
        };
      }
      throw error;
    }

    return {
      total: data.total_credits || 0,
      used: data.used_credits || 0,
      available: Math.max(0, (data.total_credits || 0) - (data.used_credits || 0)),
      resetDate: data.reset_date
    };
  } catch (error) {
    console.error('Error getting user credits:', error);
    return {
      total: 0,
      used: 0,
      available: 0,
      resetDate: null
    };
  }
}

// Middleware wrapper for API routes
export async function withCreditsCheck(
  request: NextRequest,
  action: ActionType,
  handler: (userId: string, supabase: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const { user, error, supabase } = await getUserFromRequest(request);

  if (error || !user || !supabase) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user has enough credits
  const creditCheck = await checkCredits(user.id, action, supabase);

  if (!creditCheck.canProceed) {
    return NextResponse.json(
      { 
        error: creditCheck.error || 'Insufficient credits',
        creditsRequired: creditCheck.creditsRequired,
        creditsAvailable: creditCheck.creditsAvailable
      },
      { status: 402 } // Payment Required
    );
  }

  // Execute the handler
  return handler(user.id, supabase);
}

// Add credits to user account (for webhook handler)
export async function addCredits(
  userId: string,
  creditsAmount: number,
  transactionType: 'subscription' | 'topup' | 'manual' | 'bonus',
  paymentIntentId?: string,
  pricePaid?: number
) {
  const supabase = createServerSupabaseClient();
  
  try {
    const { error } = await supabase
      .rpc('add_credits', {
        p_user_id: userId,
        p_credits_amount: creditsAmount,
        p_transaction_type: transactionType,
        p_payment_intent_id: paymentIntentId,
        p_price_paid: pricePaid
      });

    if (error) {
      console.error('Error adding credits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addCredits:', error);
    return false;
  }
}

// Reset monthly credits (for subscription renewal)
export async function resetMonthlyCredits(userId: string, creditsAmount?: number) {
  const supabase = createServerSupabaseClient();
  
  try {
    // If credits amount not provided, determine it from user's subscription tier
    let monthlyCredits = creditsAmount;
    
    if (!monthlyCredits) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();
      
      const tier = profile?.subscription_tier || 'free';
      monthlyCredits = STRIPE_CONFIG.tiers[tier as keyof typeof STRIPE_CONFIG.tiers]?.credits || STRIPE_CONFIG.credits.free_tier;
    }

    const { error } = await supabase
      .rpc('reset_monthly_credits', {
        p_user_id: userId,
        p_credits_amount: monthlyCredits
      });

    if (error) {
      console.error('Error resetting monthly credits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in resetMonthlyCredits:', error);
    return false;
  }
}