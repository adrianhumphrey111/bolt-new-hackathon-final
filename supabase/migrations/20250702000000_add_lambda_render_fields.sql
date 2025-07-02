-- Add Lambda rendering fields to the renders table

-- Add Lambda-specific fields
DO $$
BEGIN
  -- Add render_id for tracking Lambda render job
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'renders' AND column_name = 'render_id') THEN
    ALTER TABLE renders ADD COLUMN render_id text;
  END IF;
  
  -- Add bucket_name for S3 bucket
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'renders' AND column_name = 'bucket_name') THEN
    ALTER TABLE renders ADD COLUMN bucket_name text;
  END IF;
  
  -- Add progress tracking (0.0 to 1.0)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'renders' AND column_name = 'progress') THEN
    ALTER TABLE renders ADD COLUMN progress float DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0);
  END IF;
  
  -- Add quality setting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'renders' AND column_name = 'quality') THEN
    ALTER TABLE renders ADD COLUMN quality text DEFAULT 'medium' CHECK (quality IN ('low', 'medium', 'high'));
  END IF;
  
  -- Add output URL for completed renders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'renders' AND column_name = 'output_url') THEN
    ALTER TABLE renders ADD COLUMN output_url text;
  END IF;
  
  -- Update status enum to include Lambda-specific statuses
  -- First check if the constraint exists and drop it
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'renders_status_check' AND table_name = 'renders') THEN
    ALTER TABLE renders DROP CONSTRAINT renders_status_check;
  END IF;
  
  -- Add new constraint with Lambda statuses
  ALTER TABLE renders ADD CONSTRAINT renders_status_check 
    CHECK (status IN ('pending', 'starting', 'rendering', 'processing', 'completed', 'failed'));
END $$;

-- Add indexes for Lambda rendering queries
CREATE INDEX IF NOT EXISTS idx_renders_render_id ON renders(render_id) WHERE render_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_renders_progress ON renders(progress) WHERE progress IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_renders_output_url ON renders(output_url) WHERE output_url IS NOT NULL;

-- Add comments to document the Lambda fields
COMMENT ON COLUMN renders.render_id IS 'AWS Lambda render job ID for tracking';
COMMENT ON COLUMN renders.bucket_name IS 'S3 bucket name where the render output is stored';
COMMENT ON COLUMN renders.progress IS 'Render progress from 0.0 to 1.0';
COMMENT ON COLUMN renders.quality IS 'Render quality setting: low, medium, or high';
COMMENT ON COLUMN renders.output_url IS 'S3 URL of the completed render output';