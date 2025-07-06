-- Add analysis_type column to video_analysis table
ALTER TABLE video_analysis 
ADD COLUMN IF NOT EXISTS analysis_type TEXT DEFAULT 'full' CHECK (analysis_type IN ('full', 'sample'));

-- Add comment for documentation
COMMENT ON COLUMN video_analysis.analysis_type IS 'Type of analysis: "full" for complete video analysis, "sample" for 30-second sample analysis';

-- Update existing records to have 'full' analysis type (since they were processed fully)
UPDATE video_analysis 
SET analysis_type = 'full' 
WHERE analysis_type IS NULL;