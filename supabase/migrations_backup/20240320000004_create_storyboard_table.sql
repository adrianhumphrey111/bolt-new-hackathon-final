-- Create storyboard_content table
CREATE TABLE IF NOT EXISTS storyboard_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'text' or 'file'
  text_content TEXT, -- For direct text input
  file_path TEXT, -- For uploaded files
  file_type TEXT, -- 'txt', 'docx', 'pdf', 'png', 'jpg', etc.
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE storyboard_content ENABLE ROW LEVEL SECURITY;

-- Storyboard content policies
CREATE POLICY "Users can view their own storyboard content" ON storyboard_content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own storyboard content" ON storyboard_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storyboard content" ON storyboard_content
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storyboard content" ON storyboard_content
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for storyboard files
INSERT INTO storage.buckets (id, name, public) VALUES ('storyboard', 'storyboard', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for storyboard bucket
CREATE POLICY "Enable read access to storyboard files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'storyboard' 
    AND (
      EXISTS (
        SELECT 1 FROM storyboard_content sc
        JOIN projects p ON sc.project_id = p.id
        WHERE sc.file_path = storage.objects.name
        AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable insert access to storyboard files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'storyboard'
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable delete access to storyboard files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'storyboard'
    AND (
      EXISTS (
        SELECT 1 FROM storyboard_content sc
        JOIN projects p ON sc.project_id = p.id
        WHERE sc.file_path = storage.objects.name
        AND p.user_id = auth.uid()
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_storyboard_content_updated_at
  BEFORE UPDATE ON storyboard_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 