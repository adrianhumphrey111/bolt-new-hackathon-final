import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '../../../../lib/supabase/service';

const LAMBDA_URL = 'https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceSupabaseClient();

    console.log('🔄 Finding videos that need reprocessing...');

    // Get all videos first
    const { data: allVideos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        file_path,
        original_name,
        project_id,
        created_at
      `);

    if (videosError) {
      console.error('Error querying videos:', videosError);
      return NextResponse.json({ error: 'Failed to query videos' }, { status: 500 });
    }

    // Get videos with completed analysis
    const { data: completedAnalyses, error: analysisError } = await supabase
      .from('video_analysis')
      .select('video_id')
      .eq('status', 'completed');

    if (analysisError) {
      console.error('Error querying video analyses:', analysisError);
      return NextResponse.json({ error: 'Failed to query video analyses' }, { status: 500 });
    }

    // Filter videos that need reprocessing
    const completedVideoIds = new Set(completedAnalyses?.map(a => a.video_id) || []);
    const videosNeedingAnalysis = allVideos?.filter(v => !completedVideoIds.has(v.id)) || [];

    if (!videosNeedingAnalysis || videosNeedingAnalysis.length === 0) {
      return NextResponse.json({
        message: 'All videos have completed analysis',
        processed: 0
      });
    }

    console.log(`📊 Found ${videosNeedingAnalysis.length} videos needing analysis`);

    const results = [];
    const errors = [];

    // Process each video
    for (const video of videosNeedingAnalysis) {
      try {
        console.log(`🚀 Triggering Lambda for video ${video.id}`);

        // Get storyboard content for the project
        const { data: storyboardContent } = await supabase
          .from('storyboard_content')
          .select('text_content')
          .eq('project_id', video.project_id)
          .single();

        // Prepare Lambda payload
        const lambdaPayload = {
          video_id: video.id,
          project_id: video.project_id,
          additional_context: '',
          storyboard_content: storyboardContent?.text_content || '',
          has_storyboard: !!storyboardContent,
          trigger_source: 'reprocessing',
          analysis_type: 'full' // Default to full analysis
        };

        // Call Lambda function
        const lambdaResponse = await fetch(LAMBDA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lambdaPayload),
        });

        if (!lambdaResponse.ok) {
          const errorText = await lambdaResponse.text();
          console.error(`Lambda invocation failed for ${video.id}:`, lambdaResponse.status, errorText);
          errors.push({
            video_id: video.id,
            error: `Lambda returned ${lambdaResponse.status}: ${errorText}`
          });
        } else {
          console.log(`✅ Lambda triggered successfully for ${video.id}`);
          results.push({
            video_id: video.id,
            status: 'processing_started',
            file_path: video.file_path
          });
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        errors.push({
          video_id: video.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reprocessing started for ${results.length} videos`,
      processed: results.length,
      errors: errors.length,
      details: {
        successful: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Reprocessing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}