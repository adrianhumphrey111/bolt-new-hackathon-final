-- Add Stripe fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  total_credits INTEGER DEFAULT 0 NOT NULL,
  used_credits INTEGER DEFAULT 0 NOT NULL,
  reset_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('video_upload', 'ai_generate', 'ai_chat')),
  credits_used INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_payment_intent_id TEXT,
  credits_amount INTEGER NOT NULL,
  price_paid DECIMAL(10,2),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'topup', 'manual', 'bonus')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update user credits"
  ON user_credits FOR ALL
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Create policies for usage_logs
CREATE POLICY "Users can view their own usage"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Create policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Add updated_at triggers
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get remaining credits
CREATE OR REPLACE FUNCTION get_remaining_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
  v_used INTEGER;
BEGIN
  SELECT total_credits, used_credits
  INTO v_total, v_used
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  RETURN GREATEST(0, v_total - v_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use credits
CREATE OR REPLACE FUNCTION use_credits(
  p_user_id UUID,
  p_action_type TEXT,
  p_credits_amount INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Get remaining credits
  v_remaining := get_remaining_credits(p_user_id);
  
  -- Check if user has enough credits
  IF v_remaining < p_credits_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Update used credits
  UPDATE user_credits
  SET used_credits = used_credits + p_credits_amount
  WHERE user_id = p_user_id;
  
  -- Log the usage
  INSERT INTO usage_logs (user_id, action_type, credits_used, metadata)
  VALUES (p_user_id, p_action_type, p_credits_amount, p_metadata);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_transaction_type TEXT,
  p_payment_intent_id TEXT DEFAULT NULL,
  p_price_paid DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update or insert user credits
  INSERT INTO user_credits (user_id, total_credits)
  VALUES (p_user_id, p_credits_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET total_credits = user_credits.total_credits + p_credits_amount;
  
  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    stripe_payment_intent_id,
    credits_amount,
    price_paid,
    transaction_type
  )
  VALUES (
    p_user_id,
    p_payment_intent_id,
    p_credits_amount,
    p_price_paid,
    p_transaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits(p_user_id UUID, p_credits_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE user_credits
  SET 
    total_credits = p_credits_amount,
    used_credits = 0,
    reset_date = TIMEZONE('utc'::text, NOW())
  WHERE user_id = p_user_id;
  
  -- Log the reset as a transaction
  INSERT INTO credit_transactions (
    user_id,
    credits_amount,
    transaction_type
  )
  VALUES (
    p_user_id,
    p_credits_amount,
    'subscription'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;