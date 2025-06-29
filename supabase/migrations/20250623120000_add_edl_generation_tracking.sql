-- Migration to add EDL generation job tracking and step storage
-- This allows us to track progress and resume from failures

-- Table to track EDL generation jobs
CREATE TABLE edl_generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Job metadata
    user_intent TEXT NOT NULL,
    script_content TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Progress tracking
    current_step TEXT DEFAULT 'initializing',
    total_steps INTEGER DEFAULT 6,
    completed_steps INTEGER DEFAULT 0,
    
    -- Results storage
    script_segments JSONB DEFAULT '[]',
    content_matches JSONB DEFAULT '{}',
    optimized_sequence JSONB DEFAULT '[]',
    shot_list JSONB DEFAULT '[]',
    edl_document TEXT,
    shotstack_json JSONB DEFAULT '{}',
    
    -- Error handling
    error_message TEXT,
    error_step TEXT,
    raw_lambda_response JSONB,
    
    -- Lambda tracking
    lambda_invocation_id TEXT,
    execution_log JSONB DEFAULT '[]',
    
    -- Final results
    final_video_duration NUMERIC(10,2),
    script_coverage_percentage INTEGER,
    total_chunks_count INTEGER
);

-- Table to track individual agent steps within a job
CREATE TABLE edl_generation_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES edl_generation_jobs(id) ON DELETE CASCADE,
    
    -- Step identification
    step_number INTEGER NOT NULL,
    agent_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds NUMERIC(10,2),
    
    -- Status and results
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    tokens_used INTEGER,
    api_calls_made INTEGER,
    
    UNIQUE(job_id, step_number)
);

-- Indexes for performance
CREATE INDEX idx_edl_jobs_project_id ON edl_generation_jobs(project_id);
CREATE INDEX idx_edl_jobs_user_id ON edl_generation_jobs(user_id);
CREATE INDEX idx_edl_jobs_status ON edl_generation_jobs(status);
CREATE INDEX idx_edl_jobs_created_at ON edl_generation_jobs(created_at);
CREATE INDEX idx_edl_steps_job_id ON edl_generation_steps(job_id);
CREATE INDEX idx_edl_steps_status ON edl_generation_steps(status);

-- Row Level Security
ALTER TABLE edl_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE edl_generation_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for edl_generation_jobs
CREATE POLICY "Users can view their own EDL jobs" ON edl_generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own EDL jobs" ON edl_generation_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own EDL jobs" ON edl_generation_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all EDL jobs" ON edl_generation_jobs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for edl_generation_steps
CREATE POLICY "Users can view steps for their EDL jobs" ON edl_generation_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM edl_generation_jobs 
            WHERE id = edl_generation_steps.job_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all EDL steps" ON edl_generation_steps
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update job progress
CREATE OR REPLACE FUNCTION update_job_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the job's completed_steps count and current_step
    UPDATE edl_generation_jobs 
    SET 
        completed_steps = (
            SELECT COUNT(*) 
            FROM edl_generation_steps 
            WHERE job_id = NEW.job_id AND status = 'completed'
        ),
        current_step = CASE 
            WHEN NEW.status = 'completed' THEN 
                COALESCE((
                    SELECT step_name 
                    FROM edl_generation_steps 
                    WHERE job_id = NEW.job_id AND status = 'pending' 
                    ORDER BY step_number ASC 
                    LIMIT 1
                ), 'completed')
            ELSE NEW.step_name
        END,
        status = CASE 
            WHEN NEW.status = 'failed' THEN 'failed'
            WHEN (
                SELECT COUNT(*) 
                FROM edl_generation_steps 
                WHERE job_id = NEW.job_id AND status = 'completed'
            ) = (
                SELECT total_steps 
                FROM edl_generation_jobs 
                WHERE id = NEW.job_id
            ) THEN 'completed'
            ELSE status
        END,
        completed_at = CASE 
            WHEN (
                SELECT COUNT(*) 
                FROM edl_generation_steps 
                WHERE job_id = NEW.job_id AND status = 'completed'
            ) = (
                SELECT total_steps 
                FROM edl_generation_jobs 
                WHERE id = NEW.job_id
            ) THEN NOW()
            ELSE completed_at
        END
    WHERE id = NEW.job_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job progress when steps change
CREATE TRIGGER update_job_progress_trigger
    AFTER INSERT OR UPDATE ON edl_generation_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_job_progress();

-- Function to clean up old completed jobs (optional cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_edl_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete jobs older than 30 days that are completed or failed
    DELETE FROM edl_generation_jobs 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;