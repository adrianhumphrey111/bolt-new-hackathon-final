-- Add S3 location column to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS s3_location TEXT; 