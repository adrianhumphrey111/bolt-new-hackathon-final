import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';
import { withCreditsCheck, useCredits } from '../../../../../lib/credits';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  return withCreditsCheck(request, 'video_upload', async (userId, supabase) => {
    try {
      const { videoId } = await params;
      const body = await request.json();
      const { additional_context } = body;

    // Verify video exists and belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        file_path,
        original_name,
        project_id,
        projects!inner(user_id)
      `)
      .eq('id', videoId)
      .eq('projects.user_id', userId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if storyboard content exists for this project
    const { data: storyboardContent } = await supabase
      .from('storyboard_content')
      .select('text_content')
      .eq('project_id', video.project_id)
      .single();

    // Call the Lambda function directly via API Gateway
    const lambdaUrl = 'https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio';
    
    const lambdaPayload = {
      video_id: videoId,
      project_id: video.project_id,
      additional_context: additional_context || '',
      storyboard_content: storyboardContent?.text_content || '',
      has_storyboard: !!storyboardContent
    };

    console.log('🚀 Triggering Lambda re-analysis for video:', videoId);
    
    // Fire and forget - don't wait for Lambda response due to 30s timeout
    setImmediate(async () => {
      try {
        const lambdaResponse = await fetch(lambdaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lambdaPayload),
        });

        if (!lambdaResponse.ok) {
          console.error('Lambda invocation failed:', lambdaResponse.status, await lambdaResponse.text());
        } else {
          console.log('✅ Lambda re-analysis triggered successfully');
        }
      } catch (error) {
        console.error('Error calling Lambda:', error);
      }
    });

    // Use credits after Lambda has been triggered
    const creditsUsed = await useCredits(userId, 'video_upload', {
      videoId,
      videoName: video.original_name,
      action: 'reanalyze'
    }, supabase);

    if (!creditsUsed) {
      console.error('Failed to deduct credits for video reanalysis');
    }

    // Update video analysis status to indicate re-analysis is in progress
    const { error: upsertError } = await supabase
      .from('video_analysis')
      .upsert({
        video_id: videoId,
        project_id: video.project_id,
        user_id: userId,
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      }, {
        onConflict: 'video_id'
      });

    if (upsertError) {
      console.error('Error updating analysis status:', upsertError);
      // Continue anyway - this is not critical for the re-analysis to work
    }

    return NextResponse.json({
      success: true,
      message: 'Re-analysis started',
      video_id: videoId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error triggering re-analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  });
}