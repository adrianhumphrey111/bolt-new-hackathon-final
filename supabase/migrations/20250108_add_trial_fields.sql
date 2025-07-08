-- Add trial tracking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_trial BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create an index on trial_ends_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);

-- Create a function to check if user is in trial
CREATE OR REPLACE FUNCTION is_user_in_trial(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND subscription_status = 'trialing'
    AND trial_ends_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;