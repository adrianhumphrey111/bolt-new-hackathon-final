-- Remove the default value from subscription_tier column
-- New users should have NULL subscription_tier to trigger trial signup flow
-- Only grandfathered users should have 'free' tier
ALTER TABLE profiles ALTER COLUMN subscription_tier DROP DEFAULT;

-- Verify the change worked by checking the column definition
-- (This comment documents the expected result: subscription_tier should have no default value)