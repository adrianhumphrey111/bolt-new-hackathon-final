-- Create dedicated shot list table for better video association
-- This solves the issue where shot lists stored as JSON arrays in edl_generation_jobs
-- couldn't be properly associated with video entities for timeline loading

CREATE TABLE shot_list_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Foreign key relationships
    edl_generation_job_id UUID NOT NULL REFERENCES edl_generation_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE RESTRICT, -- Don't delete shots if video is deleted
    
    -- Shot identification and ordering
    shot_number INTEGER NOT NULL,
    chunk_id TEXT NOT NULL, -- The chunk identifier from lambda processing
    script_segment_id TEXT, -- Reference to script segment if applicable
    
    -- Video file references (from lambda function)
    file_name TEXT NOT NULL, -- Original file name like "1750321942369-x4ezkmwxsnk.MOV"
    file_path TEXT NOT NULL, -- Full S3 path like "project/user/videos/file.MOV"
    s3_location TEXT NOT NULL, -- Full S3 URI for generating signed URLs
    
    -- Precise timing information (from shot list generation)
    start_time DECIMAL(10,3) NOT NULL, -- Start time within the source video
    end_time DECIMAL(10,3) NOT NULL, -- End time within the source video  
    duration DECIMAL(10,3) NOT NULL, -- Duration of the shot
    
    -- Timeline positioning
    timeline_start DECIMAL(10,3) NOT NULL DEFAULT 0, -- Position in final timeline
    timeline_order INTEGER NOT NULL, -- Order in final video sequence
    
    -- Content and context
    content_preview TEXT, -- Preview text of what's said/shown
    narrative_purpose TEXT, -- Why this shot was chosen
    cut_reasoning TEXT, -- Technical reasoning for cut points
    quality_notes TEXT, -- Audio/visual quality notes
    
    -- Matching metadata from content matcher
    match_type TEXT CHECK (match_type IN ('EXACT', 'SEMANTIC', 'FALLBACK', 'NO_MATCH')),
    match_confidence DECIMAL(3,2), -- 0.00 to 1.00
    match_reasoning TEXT,
    
    -- Transition and technical specs
    transition_in TEXT DEFAULT 'none',
    transition_out TEXT DEFAULT 'none',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_shot_list_items_job_id ON shot_list_items(edl_generation_job_id);
CREATE INDEX idx_shot_list_items_project_id ON shot_list_items(project_id);
CREATE INDEX idx_shot_list_items_video_id ON shot_list_items(video_id);
CREATE INDEX idx_shot_list_items_timeline_order ON shot_list_items(edl_generation_job_id, timeline_order);
CREATE INDEX idx_shot_list_items_chunk_id ON shot_list_items(chunk_id);

-- Unique constraint to prevent duplicate shots in same job
CREATE UNIQUE INDEX idx_shot_list_items_unique_shot ON shot_list_items(edl_generation_job_id, shot_number);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shot_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shot_list_items_updated_at
    BEFORE UPDATE ON shot_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_shot_list_items_updated_at();

-- RLS Policies
ALTER TABLE shot_list_items ENABLE ROW LEVEL SECURITY;

-- Users can only access shot list items for their own projects
CREATE POLICY "Users can view their own project shot list items" ON shot_list_items
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert shot list items for their own projects" ON shot_list_items
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shot list items for their own projects" ON shot_list_items
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shot list items for their own projects" ON shot_list_items
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- View for easy shot list retrieval with video metadata
CREATE VIEW shot_list_with_video_details AS
SELECT 
    sli.*,
    v.original_name as video_original_name,
    v.duration as video_total_duration,
    v.created_at as video_upload_date,
    egj.user_intent,
    egj.status as job_status,
    egj.completed_at as job_completed_at
FROM shot_list_items sli
JOIN videos v ON sli.video_id = v.id
JOIN edl_generation_jobs egj ON sli.edl_generation_job_id = egj.id
ORDER BY sli.timeline_order;

-- Grant access to the view
GRANT SELECT ON shot_list_with_video_details TO authenticated;

-- Function to get shot list for timeline loading
CREATE OR REPLACE FUNCTION get_shot_list_for_timeline(job_id_param UUID)
RETURNS TABLE (
    shot_id UUID,
    shot_number INTEGER,
    video_id UUID,
    chunk_id TEXT,
    file_name TEXT,
    file_path TEXT,
    s3_location TEXT,
    start_time DECIMAL,
    end_time DECIMAL,
    duration DECIMAL,
    timeline_start DECIMAL,
    timeline_order INTEGER,
    content_preview TEXT,
    narrative_purpose TEXT,
    match_type TEXT,
    match_confidence DECIMAL,
    video_original_name TEXT,
    video_total_duration NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sli.id as shot_id,
        sli.shot_number,
        sli.video_id,
        sli.chunk_id,
        sli.file_name,
        sli.file_path,
        sli.s3_location,
        sli.start_time,
        sli.end_time,
        sli.duration,
        sli.timeline_start,
        sli.timeline_order,
        sli.content_preview,
        sli.narrative_purpose,
        sli.match_type,
        sli.match_confidence,
        v.original_name as video_original_name,
        v.duration as video_total_duration
    FROM shot_list_items sli
    JOIN videos v ON sli.video_id = v.id
    WHERE sli.edl_generation_job_id = job_id_param
    ORDER BY sli.timeline_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_shot_list_for_timeline(UUID) TO authenticated;