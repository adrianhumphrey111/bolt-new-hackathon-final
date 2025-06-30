-- Remove Supabase storage related fields
ALTER TABLE videos
DROP COLUMN IF EXISTS supabase_url; 