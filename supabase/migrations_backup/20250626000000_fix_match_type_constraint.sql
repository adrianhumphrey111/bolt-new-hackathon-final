-- Fix match_type constraint to include 'UNKNOWN' value
-- This fixes the database constraint violation when Lambda tries to insert shot_list_items

-- Drop the existing constraint
ALTER TABLE shot_list_items 
DROP CONSTRAINT IF EXISTS shot_list_items_match_type_check;

-- Add the updated constraint that includes 'UNKNOWN'
ALTER TABLE shot_list_items 
ADD CONSTRAINT shot_list_items_match_type_check 
CHECK (match_type IN ('EXACT', 'SEMANTIC', 'FALLBACK', 'NO_MATCH', 'UNKNOWN'));