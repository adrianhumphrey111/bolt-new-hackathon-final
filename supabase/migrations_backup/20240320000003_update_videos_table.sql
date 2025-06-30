-- Add new columns to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS duration NUMERIC,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_url TEXT; 