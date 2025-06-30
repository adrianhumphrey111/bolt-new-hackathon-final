-- Create reference_videos table (renamed from 'references' to avoid reserved word)
CREATE TABLE IF NOT EXISTS reference_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id UUID NOT NULL REFERENCES reference_videos(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL, -- Format: MM:SS
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE reference_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Reference videos policies
CREATE POLICY "Users can view their own reference videos" ON reference_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reference videos" ON reference_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reference videos" ON reference_videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reference videos" ON reference_videos
  FOR DELETE USING (auth.uid() = user_id);

-- Annotations policies
CREATE POLICY "Users can view annotations of their reference videos" ON annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reference_videos
      WHERE reference_videos.id = annotations.reference_id
      AND reference_videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create annotations for their reference videos" ON annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reference_videos
      WHERE reference_videos.id = annotations.reference_id
      AND reference_videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update annotations of their reference videos" ON annotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM reference_videos
      WHERE reference_videos.id = annotations.reference_id
      AND reference_videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete annotations of their reference videos" ON annotations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM reference_videos
      WHERE reference_videos.id = annotations.reference_id
      AND reference_videos.user_id = auth.uid()
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_reference_videos_updated_at
  BEFORE UPDATE ON reference_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 