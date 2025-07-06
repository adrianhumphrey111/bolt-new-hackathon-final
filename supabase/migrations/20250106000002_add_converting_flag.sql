-- Add converting flag to video_analysis table
ALTER TABLE video_analysis 
ADD COLUMN IF NOT EXISTS is_converting BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN video_analysis.is_converting IS 'Flag to indicate if video is currently being converted from MOV to MP4';

-- Create index for faster queries on converting status
CREATE INDEX IF NOT EXISTS idx_video_analysis_converting ON video_analysis(is_converting) WHERE is_converting = TRUE;