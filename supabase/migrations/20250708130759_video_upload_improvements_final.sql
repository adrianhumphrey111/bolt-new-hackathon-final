-- Video Upload System Improvements Migration - Final Version
-- Add progress tracking, cleanup functions, and optimization columns

-- Add progress tracking columns to video_analysis (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'processing_step') THEN
    ALTER TABLE video_analysis ADD COLUMN processing_step VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'processing_progress') THEN
    ALTER TABLE video_analysis ADD COLUMN processing_progress INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'overall_progress') THEN
    ALTER TABLE video_analysis ADD COLUMN overall_progress INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'last_progress_update') THEN
    ALTER TABLE video_analysis ADD COLUMN last_progress_update TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'checkpoint_data') THEN
    ALTER TABLE video_analysis ADD COLUMN checkpoint_data JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'retry_after') THEN
    ALTER TABLE video_analysis ADD COLUMN retry_after TIMESTAMP;
  END IF;
END $$;

-- Add upload session tracking to videos (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_session_id') THEN
    ALTER TABLE videos ADD COLUMN upload_session_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_started_at') THEN
    ALTER TABLE videos ADD COLUMN upload_started_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_completed_at') THEN
    ALTER TABLE videos ADD COLUMN upload_completed_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_speed_mbps') THEN
    ALTER TABLE videos ADD COLUMN upload_speed_mbps DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'retry_count') THEN
    ALTER TABLE videos ADD COLUMN retry_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'error_message') THEN
    ALTER TABLE videos ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Create upload_sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  total_files INTEGER DEFAULT 0,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_details JSONB
);

-- Create cleanup_jobs table for tracking cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  records_cleaned INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running',
  details JSONB
);

-- Add foreign key constraint for upload_session_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_videos_upload_session' 
                 AND table_name = 'videos') THEN
    ALTER TABLE videos 
    ADD CONSTRAINT fk_videos_upload_session 
    FOREIGN KEY (upload_session_id) REFERENCES upload_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_video_analysis_processing_step ON video_analysis(processing_step);
CREATE INDEX IF NOT EXISTS idx_video_analysis_overall_progress ON video_analysis(overall_progress);
CREATE INDEX IF NOT EXISTS idx_video_analysis_status_updated ON video_analysis(status, processing_completed_at);
CREATE INDEX IF NOT EXISTS idx_videos_upload_session ON videos(upload_session_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_is_converting ON video_analysis(is_converting) WHERE is_converting = true;
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_project_user ON upload_sessions(project_id, user_id);

-- Function to clean orphaned and stuck records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TABLE(job_id UUID, records_cleaned INTEGER, errors_found INTEGER) AS $$
DECLARE
  current_job_id UUID;
  cleaned_count INTEGER := 0;
  failed_count INTEGER := 0;
  temp_count INTEGER := 0;
BEGIN
  -- Create cleanup job record
  INSERT INTO cleanup_jobs (job_type, status)
  VALUES ('orphaned_records', 'running')
  RETURNING id INTO current_job_id;
  
  -- Clean stuck converting flags (videos stuck in converting state for > 1 hour)
  UPDATE video_analysis
  SET is_converting = false
  WHERE is_converting = true
  AND processing_started_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Mark stuck processing as failed (processing for > 30 minutes)
  UPDATE video_analysis
  SET status = 'failed',
      error_message = 'Processing timeout - stuck in processing state',
      processing_completed_at = NOW()
  WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  failed_count := failed_count + temp_count;
  
  -- Remove duplicate analysis records (keep newest)
  DELETE FROM video_analysis a
  USING video_analysis b
  WHERE a.video_id = b.video_id
  AND a.created_at < b.created_at;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Clean up old upload sessions (older than 7 days and completed/failed)
  DELETE FROM upload_sessions
  WHERE status IN ('completed', 'failed')
  AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Update cleanup job with results
  UPDATE cleanup_jobs
  SET completed_at = NOW(),
      status = 'completed',
      records_cleaned = cleaned_count,
      records_processed = cleaned_count + failed_count,
      error_count = failed_count,
      details = jsonb_build_object(
        'stuck_conversions_cleared', temp_count,
        'stuck_processing_failed', failed_count,
        'duplicate_records_removed', temp_count,
        'old_sessions_cleaned', temp_count
      )
  WHERE id = current_job_id;
  
  -- Return results
  RETURN QUERY SELECT current_job_id, cleaned_count, failed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get video processing statistics
CREATE OR REPLACE FUNCTION get_video_processing_stats()
RETURNS TABLE(
  total_videos INTEGER,
  analyzing_videos INTEGER,
  completed_videos INTEGER,
  failed_videos INTEGER,
  stuck_converting INTEGER,
  avg_processing_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_videos,
    COUNT(CASE WHEN va.status = 'processing' THEN 1 END)::INTEGER as analyzing_videos,
    COUNT(CASE WHEN va.status = 'completed' THEN 1 END)::INTEGER as completed_videos,
    COUNT(CASE WHEN va.status = 'failed' THEN 1 END)::INTEGER as failed_videos,
    COUNT(CASE WHEN va.is_converting = true THEN 1 END)::INTEGER as stuck_converting,
    AVG(va.processing_completed_at - va.processing_started_at) as avg_processing_time
  FROM videos v
  LEFT JOIN video_analysis va ON v.id = va.video_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for storage analysis
CREATE OR REPLACE VIEW video_storage_analysis AS
SELECT 
  p.id as project_id,
  p.title as project_title,
  p.user_id,
  COUNT(v.id) as video_count,
  COALESCE(SUM(v.file_size_bytes), 0) / 1024 / 1024 / 1024 as total_gb,
  COUNT(CASE WHEN va.status = 'completed' THEN 1 END) as analyzed_count,
  COUNT(CASE WHEN va.status = 'failed' THEN 1 END) as failed_count,
  COUNT(CASE WHEN va.status = 'processing' THEN 1 END) as processing_count,
  COUNT(CASE WHEN va.id IS NULL THEN 1 END) as unanalyzed_count,
  AVG(v.upload_speed_mbps) as avg_upload_speed,
  MAX(v.created_at) as last_upload
FROM projects p
LEFT JOIN videos v ON v.project_id = p.id
LEFT JOIN video_analysis va ON va.video_id = v.id
GROUP BY p.id, p.title, p.user_id;

-- Create view for upload session analysis
CREATE OR REPLACE VIEW upload_session_analysis AS
SELECT 
  us.id as session_id,
  us.project_id,
  us.user_id,
  us.session_name,
  us.total_files,
  us.completed_files,
  us.failed_files,
  us.total_size_bytes / 1024 / 1024 as total_mb,
  us.status,
  us.created_at,
  us.completed_at,
  EXTRACT(EPOCH FROM (us.completed_at - us.created_at)) / 60 as duration_minutes,
  p.title as project_title
FROM upload_sessions us
JOIN projects p ON us.project_id = p.id;

-- Enable RLS on new tables
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for upload_sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own upload sessions' AND tablename = 'upload_sessions') THEN
    CREATE POLICY "Users can view their own upload sessions" ON upload_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own upload sessions' AND tablename = 'upload_sessions') THEN
    CREATE POLICY "Users can insert their own upload sessions" ON upload_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own upload sessions' AND tablename = 'upload_sessions') THEN
    CREATE POLICY "Users can update their own upload sessions" ON upload_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS policies for cleanup_jobs (admin only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage cleanup jobs' AND tablename = 'cleanup_jobs') THEN
    CREATE POLICY "Service role can manage cleanup jobs" ON cleanup_jobs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON upload_sessions TO authenticated;
GRANT SELECT ON cleanup_jobs TO authenticated;
GRANT SELECT ON video_storage_analysis TO authenticated;
GRANT SELECT ON upload_session_analysis TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_orphaned_records() TO service_role;
GRANT EXECUTE ON FUNCTION get_video_processing_stats() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE upload_sessions IS 'Tracks batch upload sessions for progress monitoring';
COMMENT ON TABLE cleanup_jobs IS 'Logs automated cleanup operations';
COMMENT ON COLUMN video_analysis.processing_step IS 'Current processing step (e.g., uploading, converting, analyzing)';
COMMENT ON COLUMN video_analysis.overall_progress IS 'Overall progress percentage (0-100)';
COMMENT ON COLUMN video_analysis.checkpoint_data IS 'Checkpoint data for recovery';
COMMENT ON COLUMN videos.upload_session_id IS 'Links video to upload session for batch tracking';
COMMENT ON COLUMN videos.upload_speed_mbps IS 'Upload speed in Mbps for performance tracking';

-- Run initial cleanup to fix existing issues
SELECT cleanup_orphaned_records();