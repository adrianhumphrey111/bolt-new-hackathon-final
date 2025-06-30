-- Add file_size_bytes to videos table for storage tracking (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'file_size_bytes') THEN
    ALTER TABLE videos ADD COLUMN file_size_bytes bigint DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'processed_file_size_bytes') THEN
    ALTER TABLE videos ADD COLUMN processed_file_size_bytes bigint DEFAULT 0;
  END IF;
END $$;

-- Add comments to document the purpose
COMMENT ON COLUMN videos.file_size_bytes IS 'Size of the original uploaded video file in bytes';
COMMENT ON COLUMN videos.processed_file_size_bytes IS 'Size of the processed video file in bytes';

-- Create index for efficient storage calculation queries
CREATE INDEX IF NOT EXISTS idx_videos_file_sizes ON videos(file_size_bytes, processed_file_size_bytes) WHERE file_size_bytes > 0;

-- Create renders table to track video rendering events
CREATE TABLE IF NOT EXISTS renders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_ids text[] NOT NULL, -- Array of video IDs used in the render
  duration_ms integer NOT NULL, -- Duration in milliseconds
  duration_seconds numeric GENERATED ALWAYS AS (duration_ms::numeric / 1000) STORED, -- Computed seconds
  duration_minutes numeric GENERATED ALWAYS AS (duration_ms::numeric / 60000) STORED, -- Computed minutes
  fps integer DEFAULT 30,
  resolution text DEFAULT '1920x1080',
  format text DEFAULT 'mp4',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create exports table to track video export events
CREATE TABLE IF NOT EXISTS exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  render_id uuid REFERENCES renders(id) ON DELETE SET NULL,
  export_type text NOT NULL DEFAULT 'download' CHECK (export_type IN ('download', 's3', 'youtube', 'other')),
  file_size_bytes bigint,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_renders_user_id ON renders(user_id);
CREATE INDEX IF NOT EXISTS idx_renders_project_id ON renders(project_id);
CREATE INDEX IF NOT EXISTS idx_renders_created_at ON renders(created_at);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);

CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at);
CREATE INDEX IF NOT EXISTS idx_exports_render_id ON exports(render_id);

-- Create a view for user usage statistics
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT 
  u.id as user_id,
  -- Storage usage in bytes
  COALESCE(SUM(v.file_size_bytes), 0) as total_storage_bytes,
  COALESCE(SUM(v.processed_file_size_bytes), 0) as total_processed_storage_bytes,
  COALESCE(SUM(v.file_size_bytes + COALESCE(v.processed_file_size_bytes, 0)), 0) as total_combined_storage_bytes,
  -- Storage usage in GB
  ROUND(COALESCE(SUM(v.file_size_bytes + COALESCE(v.processed_file_size_bytes, 0)), 0)::numeric / 1073741824, 2) as total_storage_gb,
  -- Video counts
  COUNT(DISTINCT v.id) as total_videos,
  COUNT(DISTINCT CASE WHEN v.created_at >= date_trunc('month', now()) THEN v.id END) as videos_this_month,
  -- Render statistics
  COUNT(DISTINCT r.id) as total_renders,
  COUNT(DISTINCT CASE WHEN r.created_at >= date_trunc('month', now()) THEN r.id END) as renders_this_month,
  COALESCE(SUM(r.duration_minutes), 0) as total_minutes_rendered,
  COALESCE(SUM(CASE WHEN r.created_at >= date_trunc('month', now()) THEN r.duration_minutes ELSE 0 END), 0) as minutes_rendered_this_month,
  -- Export statistics
  COUNT(DISTINCT e.id) as total_exports,
  COUNT(DISTINCT CASE WHEN e.created_at >= date_trunc('month', now()) THEN e.id END) as exports_this_month
FROM 
  auth.users u
  LEFT JOIN projects p ON u.id = p.user_id
  LEFT JOIN videos v ON p.id = v.project_id
  LEFT JOIN renders r ON p.id = r.project_id AND r.status = 'completed'
  LEFT JOIN exports e ON p.id = e.project_id
GROUP BY u.id;

-- Grant appropriate permissions
GRANT SELECT ON user_usage_stats TO authenticated;

-- Enable RLS on new tables
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for renders table (with IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renders' AND policyname = 'Users can view their own renders') THEN
    CREATE POLICY "Users can view their own renders" ON renders FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renders' AND policyname = 'Users can create their own renders') THEN
    CREATE POLICY "Users can create their own renders" ON renders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renders' AND policyname = 'Users can update their own renders') THEN
    CREATE POLICY "Users can update their own renders" ON renders FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for exports table (with IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exports' AND policyname = 'Users can view their own exports') THEN
    CREATE POLICY "Users can view their own exports" ON exports FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exports' AND policyname = 'Users can create their own exports') THEN
    CREATE POLICY "Users can create their own exports" ON exports FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for renders table
CREATE TRIGGER update_renders_updated_at BEFORE UPDATE ON renders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();