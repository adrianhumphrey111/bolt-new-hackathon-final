-- Migration to add columns to video_analysis table
ALTER TABLE video_analysis 
ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES videos(id),
ADD COLUMN IF NOT EXISTS transcription jsonb,
ADD COLUMN IF NOT EXISTS audio_segments jsonb,
ADD COLUMN IF NOT EXISTS llm_response jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_analysis_video_id ON video_analysis(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_status ON video_analysis(status);

-- Add status constraint
DO $$ 
BEGIN 
    -- Check if the constraint doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_status'
        AND table_name = 'video_analysis'
    ) THEN
        ALTER TABLE video_analysis 
        ADD CONSTRAINT chk_status 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END $$; 