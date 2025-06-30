-- Create video_analysis table
CREATE TABLE IF NOT EXISTS video_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  raw_video_path TEXT NOT NULL, -- Original S3 path
  processed_video_path TEXT NOT NULL, -- Processed video S3 path
  analysis_result_path TEXT NOT NULL, -- Analysis results S3 path
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(video_id, blueprint_id) -- Prevent duplicate analysis for same video/blueprint combination
);

-- Add RLS policies
ALTER TABLE video_analysis ENABLE ROW LEVEL SECURITY;

-- Video analysis policies
CREATE POLICY "Users can view their own video analysis" ON video_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video analysis" ON video_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video analysis" ON video_analysis
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video analysis" ON video_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_video_analysis_updated_at
  BEFORE UPDATE ON video_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 