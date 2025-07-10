-- Grandfather existing users created on or before July 7, 2025
-- This migration sets subscription_tier to 'free' for all users created before the trial requirement

UPDATE profiles
SET 
  subscription_tier = 'free',
  updated_at = now()
WHERE 
  created_at <= '2025-07-07 23:59:59'::timestamp
  AND subscription_tier IS NULL
  AND stripe_subscription_id IS NULL;

-- Add a comment to track grandfathered users
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier. Users with "free" tier and no stripe_subscription_id are grandfathered users from before July 7, 2025.';