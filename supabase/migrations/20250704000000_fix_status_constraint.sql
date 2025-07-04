-- Fix the conflicting status check constraint
-- Drop the old constraint that doesn't allow 'queued'
ALTER TABLE video_analysis DROP CONSTRAINT IF EXISTS chk_status;

-- Add the correct constraint that includes 'queued'
ALTER TABLE video_analysis 
ADD CONSTRAINT chk_status 
CHECK (status = ANY(ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text]));