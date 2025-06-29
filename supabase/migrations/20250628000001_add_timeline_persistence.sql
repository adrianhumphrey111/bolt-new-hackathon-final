-- Timeline Persistence Migration
-- This migration adds timeline persistence functionality to store timeline state in the database

-- Create timeline_configurations table for storing complete timeline state
CREATE TABLE IF NOT EXISTS timeline_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timeline metadata
    title TEXT DEFAULT 'Untitled Timeline',
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Timeline settings
    total_duration NUMERIC NOT NULL DEFAULT 30, -- in seconds
    frame_rate INTEGER NOT NULL DEFAULT 30,
    zoom NUMERIC DEFAULT 2.0, -- pixels per frame
    playhead_position NUMERIC DEFAULT 0, -- in frames
    pixels_per_frame NUMERIC DEFAULT 2.0,
    
    -- Core timeline data stored as JSONB for flexibility
    timeline_data JSONB NOT NULL DEFAULT '{"tracks": [], "selectedItems": []}'::jsonb,
    
    -- Status tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'auto_saved', 'manually_saved', 'processing', 'completed', 'error')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active timeline per project
    UNIQUE(project_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create partial unique index for active timelines (allows multiple inactive timelines)
CREATE UNIQUE INDEX idx_timeline_configurations_active_per_project 
ON timeline_configurations (project_id) 
WHERE is_active = true;

-- Create indexes for performance
CREATE INDEX idx_timeline_configurations_project_id ON timeline_configurations(project_id);
CREATE INDEX idx_timeline_configurations_user_id ON timeline_configurations(user_id);
CREATE INDEX idx_timeline_configurations_status ON timeline_configurations(status);
CREATE INDEX idx_timeline_configurations_updated_at ON timeline_configurations(updated_at);

-- Create GIN index on timeline_data JSONB for fast queries
CREATE INDEX idx_timeline_configurations_timeline_data_gin ON timeline_configurations USING gin(timeline_data);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps
CREATE TRIGGER trigger_timeline_configurations_updated_at
    BEFORE UPDATE ON timeline_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_timeline_updated_at();

-- Function to get active timeline for a project
CREATE OR REPLACE FUNCTION get_active_timeline(p_project_id UUID)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    version INTEGER,
    total_duration NUMERIC,
    frame_rate INTEGER,
    zoom NUMERIC,
    playhead_position NUMERIC,
    pixels_per_frame NUMERIC,
    timeline_data JSONB,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_saved_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        tc.project_id,
        tc.user_id,
        tc.title,
        tc.description,
        tc.version,
        tc.total_duration,
        tc.frame_rate,
        tc.zoom,
        tc.playhead_position,
        tc.pixels_per_frame,
        tc.timeline_data,
        tc.status,
        tc.created_at,
        tc.updated_at,
        tc.last_saved_at
    FROM timeline_configurations tc
    WHERE tc.project_id = p_project_id 
    AND tc.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to create or update timeline configuration
CREATE OR REPLACE FUNCTION upsert_timeline_configuration(
    p_project_id UUID,
    p_user_id UUID,
    p_timeline_data JSONB,
    p_total_duration NUMERIC DEFAULT NULL,
    p_frame_rate INTEGER DEFAULT NULL,
    p_zoom NUMERIC DEFAULT NULL,
    p_playhead_position NUMERIC DEFAULT NULL,
    p_status TEXT DEFAULT 'auto_saved',
    p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    timeline_id UUID;
    current_version INTEGER;
BEGIN
    -- Get current version if timeline exists
    SELECT version INTO current_version
    FROM timeline_configurations
    WHERE project_id = p_project_id AND is_active = true;
    
    -- Insert or update timeline configuration
    INSERT INTO timeline_configurations (
        project_id,
        user_id,
        timeline_data,
        total_duration,
        frame_rate,
        zoom,
        playhead_position,
        status,
        title,
        version
    )
    VALUES (
        p_project_id,
        p_user_id,
        p_timeline_data,
        COALESCE(p_total_duration, 30),
        COALESCE(p_frame_rate, 30),
        COALESCE(p_zoom, 2.0),
        COALESCE(p_playhead_position, 0),
        p_status,
        COALESCE(p_title, 'Untitled Timeline'),
        COALESCE(current_version + 1, 1)
    )
    ON CONFLICT (project_id, is_active)
    DO UPDATE SET
        timeline_data = EXCLUDED.timeline_data,
        total_duration = COALESCE(EXCLUDED.total_duration, timeline_configurations.total_duration),
        frame_rate = COALESCE(EXCLUDED.frame_rate, timeline_configurations.frame_rate),
        zoom = COALESCE(EXCLUDED.zoom, timeline_configurations.zoom),
        playhead_position = COALESCE(EXCLUDED.playhead_position, timeline_configurations.playhead_position),
        status = EXCLUDED.status,
        title = COALESCE(EXCLUDED.title, timeline_configurations.title),
        version = timeline_configurations.version + 1,
        updated_at = NOW(),
        last_saved_at = NOW()
    RETURNING id INTO timeline_id;
    
    RETURN timeline_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies
ALTER TABLE timeline_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access timelines for projects they own
CREATE POLICY "Users can access their own project timelines" ON timeline_configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = timeline_configurations.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON timeline_configurations TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_timeline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_timeline_configuration(UUID, UUID, JSONB, NUMERIC, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

-- Create sample data (optional, for testing)
-- This will be commented out in production
/*
-- Example timeline data structure
INSERT INTO timeline_configurations (
    project_id,
    user_id,
    title,
    timeline_data,
    total_duration,
    frame_rate
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual project ID
    '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual user ID
    'Sample Timeline',
    '{
        "tracks": [
            {
                "id": "track-1",
                "name": "Track 1",
                "items": [],
                "height": 60
            }
        ],
        "selectedItems": []
    }'::jsonb,
    900, -- 30 seconds at 30fps
    30
) ON CONFLICT DO NOTHING;
*/