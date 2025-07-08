-- Fix handle_new_user function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with only essential fields that definitely exist
  -- This version is more defensive and handles potential column differences
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- DO NOT set subscription_tier (leave it NULL)
  -- DO NOT give initial credits to new users
  -- They will get credits when they complete the trial signup
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;