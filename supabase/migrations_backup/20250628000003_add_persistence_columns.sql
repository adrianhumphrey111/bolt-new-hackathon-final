-- Add missing columns for timeline persistence to existing timeline_configurations table
-- This extends the existing table to support our timeline persistence features

-- Add missing columns for timeline persistence
ALTER TABLE timeline_configurations 
ADD COLUMN IF NOT EXISTS zoom NUMERIC DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS playhead_position NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pixels_per_frame NUMERIC DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the status constraint to include our persistence statuses
ALTER TABLE timeline_configurations 
DROP CONSTRAINT IF EXISTS timeline_configurations_status_check;

ALTER TABLE timeline_configurations 
ADD CONSTRAINT timeline_configurations_status_check 
CHECK (status IN ('draft', 'auto_saved', 'manually_saved', 'processing', 'completed', 'error'));

-- Create or replace the upsert function for timeline persistence
CREATE OR REPLACE FUNCTION upsert_timeline_configuration(
    p_project_id UUID,
    p_user_id UUID,
    p_timeline_data JSONB,
    p_total_duration NUMERIC DEFAULT NULL,
    p_frame_rate NUMERIC DEFAULT NULL,
    p_zoom NUMERIC DEFAULT NULL,
    p_playhead_position NUMERIC DEFAULT NULL,
    p_status TEXT DEFAULT 'auto_saved',
    p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    timeline_id UUID;
    current_version INTEGER;
    existing_timeline_id UUID;
BEGIN
    -- Check if an active timeline already exists for this project
    SELECT id, version INTO existing_timeline_id, current_version
    FROM timeline_configurations
    WHERE project_id = p_project_id AND is_active = true;
    
    -- If timeline exists, update it
    IF existing_timeline_id IS NOT NULL THEN
        UPDATE timeline_configurations 
        SET 
            timeline_data = p_timeline_data,
            total_duration = COALESCE(p_total_duration, total_duration),
            frame_rate = COALESCE(p_frame_rate, frame_rate),
            zoom = COALESCE(p_zoom, zoom),
            playhead_position = COALESCE(p_playhead_position, playhead_position),
            status = p_status,
            title = COALESCE(p_title, title),
            version = current_version + 1,
            updated_at = NOW(),
            last_saved_at = NOW()
        WHERE id = existing_timeline_id
        RETURNING id INTO timeline_id;
    ELSE
        -- Insert new timeline configuration
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
            version,
            is_active,
            pixels_per_frame,
            last_saved_at
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
            1,
            true,
            2.0,
            NOW()
        )
        RETURNING id INTO timeline_id;
    END IF;
    
    RETURN timeline_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_timeline_configuration(UUID, UUID, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

-- Update the trigger function to also update last_saved_at
CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps (if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_timeline_configurations_updated_at ON timeline_configurations;
CREATE TRIGGER trigger_timeline_configurations_updated_at
    BEFORE UPDATE ON timeline_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_timeline_updated_at();