import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';
import { withCreditsCheck } from '../../../../../lib/credits';

const LAMBDA_URL = 'https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  return withCreditsCheck(request, 'video_upload', async (userId, supabase) => {
    try {
      const { videoId } = await params;
      
      // Get request body for analysis type and file size
      const body = await request.json();
      const analysisType = body.analysisType || 'full';
      const fileSize = body.fileSize || 0;

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

      // Check if file needs conversion (>500MB or MOV format)
      const CONVERSION_SIZE_THRESHOLD = 500 * 1024 * 1024; // 500MB
      const needsConversion = fileSize > CONVERSION_SIZE_THRESHOLD || 
                             video.original_name?.toLowerCase().endsWith('.mov');

      // Create video_analysis record
      const { data: analysis, error: analysisError } = await supabase
        .from('video_analysis')
        .insert({
          video_id: videoId,
          project_id: video.project_id,
          user_id: userId,
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          analysis_type: analysisType,
          is_converting: needsConversion
        })
        .select()
        .single();

      if (analysisError) {
        console.error('Error creating analysis record:', analysisError);
        return NextResponse.json({ error: 'Failed to create analysis record' }, { status: 500 });
      }

      // Get storyboard content
      const { data: storyboardContent } = await supabase
        .from('storyboard_content')
        .select('text_content')
        .eq('project_id', video.project_id)
        .single();

      // Prepare Lambda payload
      const lambdaPayload = {
        video_id: videoId,
        project_id: video.project_id,
        additional_context: '',
        storyboard_content: storyboardContent?.text_content || '',
        has_storyboard: !!storyboardContent,
        trigger_source: 'immediate_processing',
        analysis_type: analysisType
      };

      console.log(`🚀 Triggering Lambda immediately for video ${videoId}`);

      // Call Lambda function immediately
      const lambdaResponse = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lambdaPayload),
      });

      if (!lambdaResponse.ok) {
        const errorText = await lambdaResponse.text();
        console.error(`Lambda invocation failed for ${videoId}:`, lambdaResponse.status, errorText);
        
        // Update status to failed
        await supabase
          .from('video_analysis')
          .update({
            status: 'failed',
            error_message: `Lambda invocation failed: ${errorText}`,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', analysis.id);
        
        return NextResponse.json({ 
          error: 'Failed to start analysis',
          details: errorText 
        }, { status: 500 });
      }

      console.log(`✅ Lambda triggered successfully for ${videoId}`);

      return NextResponse.json({
        success: true,
        message: 'Video analysis started',
        video_id: videoId,
        analysis_id: analysis.id,
        status: 'processing',
        analysis_type: analysisType,
        needs_conversion: needsConversion
      });

    } catch (error) {
      console.error('Error starting video analysis:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}