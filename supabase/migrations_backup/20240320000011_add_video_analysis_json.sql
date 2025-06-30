-- Add video_analysis column to video_analysis table
ALTER TABLE video_analysis 
ADD COLUMN IF NOT EXISTS video_analysis jsonb;

-- Create an index on the video_analysis column for better query performance
CREATE INDEX IF NOT EXISTS idx_video_analysis_json ON video_analysis USING gin(video_analysis);

-- Add a check constraint to ensure it's valid JSON
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_video_analysis_json'
        AND table_name = 'video_analysis'
    ) THEN
        ALTER TABLE video_analysis 
        ADD CONSTRAINT chk_video_analysis_json 
        CHECK (video_analysis IS NULL OR jsonb_typeof(video_analysis) = 'object');
    END IF;
END $$; 