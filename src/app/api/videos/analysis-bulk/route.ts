import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get authenticated client
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get video_ids from query params
    const { searchParams } = new URL(request.url);
    const videoIdsParam = searchParams.get('video_ids');

    if (!videoIdsParam) {
      return NextResponse.json({ error: 'video_ids parameter is required' }, { status: 400 });
    }

    const videoIds = videoIdsParam.split(',').filter(id => id.trim());

    if (videoIds.length === 0) {
      return NextResponse.json({ analyses: [] });
    }

    // Verify user has access to these videos by checking project ownership
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, project_id, projects!inner(user_id)')
      .in('id', videoIds)
      .eq('projects.user_id', user.id);

    if (videosError) {
      console.error('Error verifying video access:', videosError);
      return NextResponse.json({ error: 'Failed to verify video access' }, { status: 500 });
    }

    // Get the verified video IDs that the user has access to
    const accessibleVideoIds = videos?.map(v => v.id) || [];

    if (accessibleVideoIds.length === 0) {
      return NextResponse.json({ analyses: [] });
    }

    // Get analysis data for accessible videos
    const { data: analyses, error: analysisError } = await supabase
      .from('video_analysis')
      .select('video_id, status, transcription, llm_response, video_analysis, processing_completed_at')
      .in('video_id', accessibleVideoIds)
      .eq('status', 'completed')
      .not('transcription', 'is', null)
      .order('processing_completed_at', { ascending: false });

    if (analysisError) {
      console.error('Error fetching analysis data:', analysisError);
      return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
    }

    return NextResponse.json({
      analyses: analyses || []
    });

  } catch (error) {
    console.error('Error in analysis-bulk GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}