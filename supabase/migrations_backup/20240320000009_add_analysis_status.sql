-- Add analysis tracking fields to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS invocation_arn TEXT,
ADD COLUMN IF NOT EXISTS output_location TEXT,
ADD COLUMN IF NOT EXISTS metadata_location TEXT; 