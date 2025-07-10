-- Add progress_message column to video_analysis table
-- This column will store human-readable progress messages from the Lambda function
-- to complement the existing progress tracking columns

ALTER TABLE video_analysis 
ADD COLUMN progress_message TEXT;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN video_analysis.progress_message IS 'Human-readable progress message from the Lambda processing function';

-- Index for performance when querying by progress messages (optional)
-- CREATE INDEX IF NOT EXISTS idx_video_analysis_progress_message ON video_analysis (progress_message) WHERE progress_message IS NOT NULL;