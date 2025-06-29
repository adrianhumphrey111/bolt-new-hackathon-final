-- Add processed file columns to videos table
ALTER TABLE videos 
ADD COLUMN processed_file_path text,
ADD COLUMN processed_bucket text;

-- Add comment to document the purpose
COMMENT ON COLUMN videos.processed_file_path IS 'File path of processed video (e.g., converted MOV to MP4)';
COMMENT ON COLUMN videos.processed_bucket IS 'S3 bucket containing the processed video file';

-- Create index for efficient querying of processed files
CREATE INDEX idx_videos_processed_file_path ON videos(processed_file_path) WHERE processed_file_path IS NOT NULL;