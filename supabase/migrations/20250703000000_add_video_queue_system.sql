-- Add queue management fields to video_analysis table
ALTER TABLE video_analysis 
ADD COLUMN IF NOT EXISTS queue_position INTEGER,
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Update status constraint to include 'queued' status
DO $$ 
BEGIN
    -- First, drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'video_analysis_status_check'
        AND table_name = 'video_analysis'
    ) THEN
        ALTER TABLE video_analysis DROP CONSTRAINT video_analysis_status_check;
    END IF;
    
    -- Add the new constraint with 'queued' status
    ALTER TABLE video_analysis 
    ADD CONSTRAINT video_analysis_status_check 
    CHECK (status IN ('queued', 'processing', 'completed', 'failed'));
END $$;

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_video_analysis_queue ON video_analysis(status, queue_position) 
WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_video_analysis_processing ON video_analysis(status, processing_started_at) 
WHERE status = 'processing';

-- Function to get next queue position
CREATE OR REPLACE FUNCTION get_next_queue_position()
RETURNS INTEGER AS $$
DECLARE
    max_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO max_position
    FROM video_analysis
    WHERE status IN ('queued', 'processing');
    
    RETURN max_position;
END;
$$ LANGUAGE plpgsql;

-- Function to update queue positions after processing
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a video moves from queued to processing or completed, update queue positions
    IF OLD.status = 'queued' AND NEW.status IN ('processing', 'completed', 'failed') THEN
        UPDATE video_analysis
        SET queue_position = queue_position - 1
        WHERE status = 'queued' 
        AND queue_position > OLD.queue_position;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for queue position updates
DROP TRIGGER IF EXISTS trigger_update_queue_positions ON video_analysis;
CREATE TRIGGER trigger_update_queue_positions
AFTER UPDATE OF status ON video_analysis
FOR EACH ROW
EXECUTE FUNCTION update_queue_positions();

-- Add function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    queued_count INTEGER,
    processing_count INTEGER,
    completed_today INTEGER,
    failed_today INTEGER,
    avg_processing_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'queued')::INTEGER as queued_count,
        COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND DATE(processing_completed_at) = CURRENT_DATE)::INTEGER as completed_today,
        COUNT(*) FILTER (WHERE status = 'failed' AND DATE(updated_at) = CURRENT_DATE)::INTEGER as failed_today,
        AVG(processing_completed_at - processing_started_at) FILTER (WHERE status = 'completed' AND processing_completed_at IS NOT NULL) as avg_processing_time
    FROM video_analysis
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_queue_position() TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_stats(UUID) TO authenticated;