-- Migration: Add RLS policy for edl_generation_steps table
-- Purpose: The edl_generation_steps table tracks detailed progress of each step in the AI workflow
-- This allows the frontend to show granular progress updates like:
-- Step 1/5: Script Analysis (in progress)
-- Step 2/5: Content Matching (pending)
-- etc.

-- Enable RLS on edl_generation_steps if not already enabled
ALTER TABLE edl_generation_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for edl_generation_steps
-- Users can only access steps for jobs they own (via the job's user_id)
CREATE POLICY "Users can access their own EDL generation steps"
ON edl_generation_steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM edl_generation_jobs 
    WHERE edl_generation_jobs.id = edl_generation_steps.job_id 
    AND edl_generation_jobs.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON edl_generation_steps TO authenticated;