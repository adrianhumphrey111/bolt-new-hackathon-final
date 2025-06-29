import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    // Get authentication
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
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
      .eq('projects.user_id', session.user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get analysis status
    const { data: analysis, error: analysisError } = await supabase
      .from('video_analysis')
      .select('status, processing_started_at, processing_completed_at, llm_response')
      .eq('video_id', videoId)
      .single();

    if (analysisError) {
      return NextResponse.json({
        video_id: videoId,
        status: 'not_found',
        has_analysis: false
      });
    }

    return NextResponse.json({
      video_id: videoId,
      video_name: video.original_name,
      status: analysis.status,
      processing_started_at: analysis.processing_started_at,
      processing_completed_at: analysis.processing_completed_at,
      has_analysis: !!analysis.llm_response,
      segments_count: analysis.llm_response?.sceneAnalysis?.length || 0
    });

  } catch (error) {
    console.error('Error checking analysis status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}