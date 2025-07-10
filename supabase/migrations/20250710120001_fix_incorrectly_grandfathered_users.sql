-- Fix users who incorrectly got 'free' tier after July 7, 2025
-- These users should go through the trial signup flow instead
-- Only users created on or before July 7, 2025 should have grandfathered 'free' tier

UPDATE profiles
SET 
  subscription_tier = NULL,
  updated_at = now()
WHERE 
  created_at > '2025-07-07 23:59:59'::timestamp
  AND subscription_tier = 'free'
  AND stripe_subscription_id IS NULL;

-- Add a note about this cleanup
-- Users created after July 7, 2025 with 'free' tier were incorrectly grandfathered
-- due to the column default value and have been reset to NULL