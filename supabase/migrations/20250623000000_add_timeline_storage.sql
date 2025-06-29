-- Add timeline storage for video editing projects
-- This stores the timeline configuration and edit decision lists

-- Timeline table to store project timelines
CREATE TABLE timeline_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timeline metadata
    title TEXT DEFAULT 'Untitled Timeline',
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Timeline structure (JSON representation)
    timeline_data JSONB NOT NULL DEFAULT '{}',
    
    -- EDL data from Lambda function
    edl_document TEXT,
    shot_list JSONB DEFAULT '[]',
    optimized_sequence JSONB DEFAULT '[]',
    content_matches JSONB DEFAULT '{}',
    shotstack_json JSONB DEFAULT '{}',
    
    -- Timeline settings
    total_duration NUMERIC(10,3) DEFAULT 0, -- in seconds
    frame_rate NUMERIC(5,2) DEFAULT 30.0,
    resolution_width INTEGER DEFAULT 1920,
    resolution_height INTEGER DEFAULT 1080,
    pixels_per_second INTEGER DEFAULT 50,
    
    -- EDL metadata
    user_intent TEXT,
    script_content TEXT,
    script_coverage_percentage NUMERIC(5,2),
    total_clips_count INTEGER DEFAULT 0,
    
    -- Processing status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'error')),
    lambda_invocation_id TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Standard fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline tracks table (for structured track data)
CREATE TABLE timeline_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timeline_id UUID NOT NULL REFERENCES timeline_configurations(id) ON DELETE CASCADE,
    
    -- Track properties
    track_index INTEGER NOT NULL,
    track_name TEXT NOT NULL,
    track_type TEXT NOT NULL CHECK (track_type IN ('video', 'audio', 'subtitle')),
    
    -- Track settings
    height INTEGER DEFAULT 60,
    is_muted BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    volume NUMERIC(3,2) DEFAULT 1.0,
    
    -- Track data
    clips_data JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(timeline_id, track_index)
);

-- Timeline clips table (for individual clip data)
CREATE TABLE timeline_clips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timeline_id UUID NOT NULL REFERENCES timeline_configurations(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES timeline_tracks(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    
    -- Clip identification
    clip_name TEXT,
    clip_source_path TEXT,
    
    -- Timeline positioning
    timeline_start NUMERIC(10,3) NOT NULL, -- in seconds
    timeline_duration NUMERIC(10,3) NOT NULL, -- in seconds
    
    -- Source video trimming
    source_in_point NUMERIC(10,3) DEFAULT 0, -- trim start in source video
    source_out_point NUMERIC(10,3), -- trim end in source video
    source_duration NUMERIC(10,3), -- original source duration
    
    -- Visual properties
    color TEXT DEFAULT '#3B82F6',
    thumbnail_url TEXT,
    
    -- Transitions
    transition_in TEXT DEFAULT 'none',
    transition_out TEXT DEFAULT 'none',
    transition_duration NUMERIC(5,3) DEFAULT 0,
    
    -- EDL metadata
    chunk_id TEXT, -- From Lambda EDL response
    script_segment_id TEXT,
    match_type TEXT,
    match_confidence NUMERIC(3,2),
    narrative_purpose TEXT,
    editorial_reasoning TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_timeline_configurations_project_id ON timeline_configurations(project_id);
CREATE INDEX idx_timeline_configurations_user_id ON timeline_configurations(user_id);
CREATE INDEX idx_timeline_configurations_status ON timeline_configurations(status);
CREATE INDEX idx_timeline_configurations_active ON timeline_configurations(project_id, is_active) WHERE is_active = true;

CREATE INDEX idx_timeline_tracks_timeline_id ON timeline_tracks(timeline_id);
CREATE INDEX idx_timeline_tracks_index ON timeline_tracks(timeline_id, track_index);

CREATE INDEX idx_timeline_clips_timeline_id ON timeline_clips(timeline_id);
CREATE INDEX idx_timeline_clips_track_id ON timeline_clips(track_id);
CREATE INDEX idx_timeline_clips_video_id ON timeline_clips(video_id);
CREATE INDEX idx_timeline_clips_timeline_start ON timeline_clips(timeline_id, timeline_start);

-- GIN indexes for JSONB columns
CREATE INDEX idx_timeline_configurations_timeline_data ON timeline_configurations USING GIN (timeline_data);
CREATE INDEX idx_timeline_configurations_shot_list ON timeline_configurations USING GIN (shot_list);
CREATE INDEX idx_timeline_tracks_clips_data ON timeline_tracks USING GIN (clips_data);

-- RLS (Row Level Security) policies
ALTER TABLE timeline_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_clips ENABLE ROW LEVEL SECURITY;

-- Timeline configurations policies
CREATE POLICY "Users can view their own timeline configurations"
    ON timeline_configurations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create timeline configurations for their projects"
    ON timeline_configurations FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = timeline_configurations.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own timeline configurations"
    ON timeline_configurations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline configurations"
    ON timeline_configurations FOR DELETE
    USING (auth.uid() = user_id);

-- Timeline tracks policies
CREATE POLICY "Users can view tracks from their timelines"
    ON timeline_tracks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_tracks.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tracks for their timelines"
    ON timeline_tracks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_tracks.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tracks from their timelines"
    ON timeline_tracks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_tracks.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tracks from their timelines"
    ON timeline_tracks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_tracks.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

-- Timeline clips policies
CREATE POLICY "Users can view clips from their timelines"
    ON timeline_clips FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_clips.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create clips for their timelines"
    ON timeline_clips FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_clips.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clips from their timelines"
    ON timeline_clips FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_clips.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clips from their timelines"
    ON timeline_clips FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM timeline_configurations tc
            WHERE tc.id = timeline_clips.timeline_id
            AND tc.user_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timeline_configurations_updated_at
    BEFORE UPDATE ON timeline_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_tracks_updated_at
    BEFORE UPDATE ON timeline_tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_clips_updated_at
    BEFORE UPDATE ON timeline_clips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get active timeline for a project
CREATE OR REPLACE FUNCTION get_active_timeline(p_project_id UUID)
RETURNS TABLE (
    timeline_id UUID,
    timeline_data JSONB,
    total_duration NUMERIC,
    tracks JSONB,
    clips JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id as timeline_id,
        tc.timeline_data,
        tc.total_duration,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', tt.id,
                    'track_index', tt.track_index,
                    'track_name', tt.track_name,
                    'track_type', tt.track_type,
                    'height', tt.height,
                    'is_muted', tt.is_muted,
                    'is_locked', tt.is_locked,
                    'is_visible', tt.is_visible,
                    'clips_data', tt.clips_data
                ) ORDER BY tt.track_index
            ) FILTER (WHERE tt.id IS NOT NULL),
            '[]'::json
        )::jsonb as tracks,
        COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id', cl.id,
                        'track_id', cl.track_id,
                        'video_id', cl.video_id,
                        'clip_name', cl.clip_name,
                        'clip_source_path', cl.clip_source_path,
                        'timeline_start', cl.timeline_start,
                        'timeline_duration', cl.timeline_duration,
                        'source_in_point', cl.source_in_point,
                        'source_out_point', cl.source_out_point,
                        'color', cl.color,
                        'thumbnail_url', cl.thumbnail_url,
                        'chunk_id', cl.chunk_id,
                        'script_segment_id', cl.script_segment_id
                    ) ORDER BY cl.timeline_start
                )
                FROM timeline_clips cl 
                WHERE cl.timeline_id = tc.id
            ),
            '[]'::json
        )::jsonb as clips
    FROM timeline_configurations tc
    LEFT JOIN timeline_tracks tt ON tc.id = tt.timeline_id
    WHERE tc.project_id = p_project_id 
    AND tc.is_active = true
    GROUP BY tc.id, tc.timeline_data, tc.total_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;