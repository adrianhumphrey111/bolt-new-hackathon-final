-- Update handle_new_user function to give initial free credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url, subscription_tier)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'free'
  );
  
  -- Give initial free credits (100 credits for free tier)
  INSERT INTO public.user_credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 100, 0);
  
  -- Log the initial credit grant
  INSERT INTO public.credit_transactions (
    user_id,
    credits_amount,
    transaction_type
  )
  VALUES (
    NEW.id,
    100,
    'bonus'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant free credits to existing users who don't have any credits yet
INSERT INTO user_credits (user_id, total_credits, used_credits)
SELECT 
  p.id,
  100,
  0
FROM profiles p
LEFT JOIN user_credits uc ON p.id = uc.user_id
WHERE uc.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Log the retroactive credit grants
INSERT INTO credit_transactions (user_id, credits_amount, transaction_type)
SELECT 
  p.id,
  100,
  'bonus'
FROM profiles p
LEFT JOIN user_credits uc ON p.id = uc.user_id
WHERE uc.user_id IS NULL;