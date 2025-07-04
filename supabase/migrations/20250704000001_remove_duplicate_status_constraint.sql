-- Remove the duplicate status constraint
-- Keep video_analysis_status_check and remove chk_status
ALTER TABLE video_analysis DROP CONSTRAINT IF EXISTS chk_status;