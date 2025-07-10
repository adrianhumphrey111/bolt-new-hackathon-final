import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoIds } = await request.json();
    
    if (!videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json({ error: 'Video IDs required' }, { status: 400 });
    }

    // Get failed videos that belong to the user
    const { data: failedVideos, error: fetchError } = await supabase
      .from('video_analysis')
      .select(`
        id,
        video_id,
        video:videos!inner(
          id,
          original_name,
          project_id,
          projects!inner(user_id)
        )
      `)
      .in('video_id', videoIds)
      .eq('status', 'failed')
      .eq('video.projects.user_id', user.id);

    if (fetchError) {
      console.error('Error fetching failed videos:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    const retryResults = [];

    for (const analysis of failedVideos || []) {
      try {
        // Reset the analysis record to processing state
        const { error: updateError } = await supabase
          .from('video_analysis')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString(),
            error_message: null,
            processing_completed_at: null
          })
          .eq('id', analysis.id);

        if (updateError) {
          console.error(`Failed to reset analysis for video ${analysis.video_id}:`, updateError);
          retryResults.push({
            videoId: analysis.video_id,
            success: false,
            error: 'Failed to reset analysis state'
          });
          continue;
        }

        // Trigger new analysis
        const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/videos/${analysis.video_id}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            analysisType: 'full',
            retry: true
          })
        });

        retryResults.push({
          videoId: analysis.video_id,
          success: analyzeResponse.ok,
          error: analyzeResponse.ok ? null : `HTTP ${analyzeResponse.status}`
        });

      } catch (error) {
        console.error(`Failed to retry analysis for video ${analysis.video_id}:`, error);
        retryResults.push({
          videoId: analysis.video_id,
          success: false,
          error: 'Internal error during retry'
        });
      }
    }

    const successCount = retryResults.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Retried ${successCount} of ${retryResults.length} videos`,
      results: retryResults
    });

  } catch (error) {
    console.error('Error retrying failed videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}