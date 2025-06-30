-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

-- Create new storage policies with project-based access
CREATE POLICY "Enable read access to project videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' 
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable insert access to project videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable update access to project videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos'
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enable delete access to project videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
        AND projects.user_id = auth.uid()
      )
    )
  );

-- Ensure the videos bucket exists and is private
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('videos', 'videos', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
END $$; 