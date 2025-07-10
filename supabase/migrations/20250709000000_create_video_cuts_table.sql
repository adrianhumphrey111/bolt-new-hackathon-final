-- Create video_cuts table for storing detected cuts
CREATE TABLE public.video_cuts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    source_start DECIMAL(10,3) NOT NULL, -- Start time in source video (seconds with millisecond precision)
    source_end DECIMAL(10,3) NOT NULL,   -- End time in source video (seconds with millisecond precision)
    cut_type TEXT NOT NULL,              -- 'filler_word', 'bad_take', 'off_topic', 'silence', 'repetitive_content'
    confidence DECIMAL(4,3) NOT NULL,    -- Confidence score from 0.000 to 1.000
    reasoning TEXT,                      -- LLM reasoning for the cut
    affected_text TEXT,                  -- Text content that would be removed
    is_active BOOLEAN DEFAULT false,     -- Whether this cut is currently applied
    bulk_operation_id UUID,              -- Groups cuts from same operation for bulk undo
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_cut_operations table for tracking bulk operations
CREATE TABLE public.video_cut_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,       -- 'smart_cleanup', 'manual_selection', etc.
    user_prompt TEXT,                   -- Custom user instructions
    cut_types TEXT[],                   -- Array of cut types processed
    confidence_threshold DECIMAL(4,3),  -- Minimum confidence used
    cuts_created INTEGER DEFAULT 0,     -- Number of cuts created
    time_saved_seconds DECIMAL(10,3),   -- Total time saved in seconds
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_video_cuts_video_id ON public.video_cuts(video_id);
CREATE INDEX idx_video_cuts_is_active ON public.video_cuts(is_active);
CREATE INDEX idx_video_cuts_cut_type ON public.video_cuts(cut_type);
CREATE INDEX idx_video_cuts_confidence ON public.video_cuts(confidence);
CREATE INDEX idx_video_cuts_bulk_operation ON public.video_cuts(bulk_operation_id);
CREATE INDEX idx_video_cuts_source_times ON public.video_cuts(source_start, source_end);

CREATE INDEX idx_video_cut_operations_video_id ON public.video_cut_operations(video_id);
CREATE INDEX idx_video_cut_operations_created_by ON public.video_cut_operations(created_by);

-- Add constraints
ALTER TABLE public.video_cuts 
ADD CONSTRAINT video_cuts_source_start_positive CHECK (source_start >= 0),
ADD CONSTRAINT video_cuts_source_end_positive CHECK (source_end >= 0),
ADD CONSTRAINT video_cuts_start_before_end CHECK (source_start < source_end),
ADD CONSTRAINT video_cuts_confidence_range CHECK (confidence >= 0 AND confidence <= 1),
ADD CONSTRAINT video_cuts_type_valid CHECK (cut_type IN ('filler_word', 'bad_take', 'off_topic', 'silence', 'repetitive_content'));

ALTER TABLE public.video_cut_operations
ADD CONSTRAINT video_cut_operations_confidence_range CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
ADD CONSTRAINT video_cut_operations_cuts_positive CHECK (cuts_created >= 0),
ADD CONSTRAINT video_cut_operations_time_positive CHECK (time_saved_seconds >= 0);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.video_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_cut_operations ENABLE ROW LEVEL SECURITY;

-- Users can only access cuts for videos in their projects
CREATE POLICY "Users can access cuts for their videos" ON public.video_cuts
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.videos v 
        JOIN public.projects p ON v.project_id = p.id 
        WHERE v.id = video_cuts.video_id AND p.user_id = auth.uid()
    )
);

-- Users can only access their own cut operations
CREATE POLICY "Users can access their own cut operations" ON public.video_cut_operations
FOR ALL USING (created_by = auth.uid());

-- Add updated_at trigger for video_cuts
CREATE TRIGGER update_video_cuts_updated_at
    BEFORE UPDATE ON public.video_cuts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.video_cuts TO authenticated;
GRANT ALL ON public.video_cut_operations TO authenticated;