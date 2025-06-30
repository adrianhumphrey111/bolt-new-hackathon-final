-- Create blueprints table
CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_type TEXT NOT NULL CHECK (blueprint_type IN ('input', 'output')),
  blueprint_name TEXT NOT NULL,
  blueprint_arn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating', -- creating, active, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (project_id, blueprint_type) -- Ensures only one blueprint per type per project
);

-- Add RLS policies
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

-- Blueprint policies
CREATE POLICY "Users can view their own blueprints" ON blueprints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blueprints" ON blueprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blueprints" ON blueprints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blueprints" ON blueprints
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 