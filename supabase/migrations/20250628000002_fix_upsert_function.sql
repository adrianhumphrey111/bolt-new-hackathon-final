-- Fix the upsert_timeline_configuration function to handle conflicts correctly
-- The issue is that the ON CONFLICT clause doesn't match the actual unique constraint

-- Drop and recreate the upsert function with correct conflict handling
DROP FUNCTION IF EXISTS upsert_timeline_configuration(UUID, UUID, JSONB, NUMERIC, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT);

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
            is_active
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
            true
        )
        RETURNING id INTO timeline_id;
    END IF;
    
    RETURN timeline_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_timeline_configuration(UUID, UUID, JSONB, NUMERIC, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;