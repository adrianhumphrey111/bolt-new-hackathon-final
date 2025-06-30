import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    // Check authentication and get authenticated client
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify video exists and belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        original_name,
        project_id,
        projects!inner(user_id)
      `)
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get analysis data
    const { data: analysis, error: analysisError } = await supabase
      .from('video_analysis')
      .select('llm_response, status, processing_started_at, processing_completed_at')
      .eq('video_id', videoId)
      .single();

    if (analysisError) {
      if (analysisError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({
          video_id: videoId,
          video_name: video.original_name,
          has_analysis: false,
          analysis_data: null
        });
      }
      throw analysisError;
    }

    return NextResponse.json({
      video_id: videoId,
      video_name: video.original_name,
      has_analysis: !!analysis.llm_response,
      status: analysis.status,
      processing_started_at: analysis.processing_started_at,
      processing_completed_at: analysis.processing_completed_at,
      analysis_data: analysis.llm_response
    });

  } catch (error) {
    console.error('Error fetching video analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}