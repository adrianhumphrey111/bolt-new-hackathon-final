-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Users can view videos of their projects" ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create videos for their projects" ON videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update videos of their projects" ON videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete videos of their projects" ON videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- Create storage policies
CREATE POLICY "Users can view their own videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND (
      EXISTS (
        SELECT 1 FROM videos
        JOIN projects ON videos.project_id = projects.id
        WHERE videos.file_path = storage.objects.name
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload their own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = (SELECT project_id FROM videos WHERE file_path = storage.objects.name LIMIT 1)
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos' AND (
      EXISTS (
        SELECT 1 FROM videos
        JOIN projects ON videos.project_id = projects.id
        WHERE videos.file_path = storage.objects.name
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos' AND (
      EXISTS (
        SELECT 1 FROM videos
        JOIN projects ON videos.project_id = projects.id
        WHERE videos.file_path = storage.objects.name
        AND projects.user_id = auth.uid()
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 