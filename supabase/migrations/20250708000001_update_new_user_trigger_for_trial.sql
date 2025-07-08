-- Update handle_new_user function to NOT set subscription_tier for new users
-- This forces them to go through the trial paywall flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile WITHOUT setting subscription_tier (leave it NULL)
  -- This will force new users to go through the trial paywall
  INSERT INTO public.profiles (id, username, full_name, avatar_url, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NOW(),
    NOW()
  );
  
  -- DO NOT give initial credits to new users
  -- They will get credits when they complete the trial signup
  -- This prevents them from getting free credits before choosing a plan
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;