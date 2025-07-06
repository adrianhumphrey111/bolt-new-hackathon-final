import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';
import { withCreditsCheck } from '../../../../../lib/credits';

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

      // Get next queue position
      const { data: queuePosition, error: queueError } = await supabase
        .rpc('get_next_queue_position');

      if (queueError) {
        console.error('Error getting queue position:', queueError);
        return NextResponse.json({ error: 'Failed to queue video' }, { status: 500 });
      }

      // Check if analysis record already exists
      const { data: existingAnalysis } = await supabase
        .from('video_analysis')
        .select('id, status')
        .eq('video_id', videoId)
        .single();

      let analysis;
      if (existingAnalysis) {
        // Update existing record
        const { data: updatedAnalysis, error: updateError } = await supabase
          .from('video_analysis')
          .update({
            status: 'queued',
            queue_position: queuePosition,
            queued_at: new Date().toISOString(),
            retry_count: 0,
            max_retries: 3,
            error_message: null,
            processing_started_at: null,
            processing_completed_at: null,
            analysis_type: analysisType,
            is_converting: needsConversion
          })
          .eq('video_id', videoId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating analysis record:', updateError);
          return NextResponse.json({ error: 'Failed to queue video analysis' }, { status: 500 });
        }
        analysis = updatedAnalysis;
      } else {
        // Create new record
        const { data: newAnalysis, error: insertError } = await supabase
          .from('video_analysis')
          .insert({
            video_id: videoId,
            project_id: video.project_id,
            user_id: userId,
            status: 'queued',
            queue_position: queuePosition,
            queued_at: new Date().toISOString(),
            retry_count: 0,
            max_retries: 3,
            analysis_type: analysisType,
            is_converting: needsConversion
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating analysis record:', insertError);
          return NextResponse.json({ error: 'Failed to queue video analysis' }, { status: 500 });
        }
        analysis = newAnalysis;
      }


      // Get queue statistics
      const { data: queueStats } = await supabase
        .rpc('get_queue_stats', { p_user_id: userId });

      return NextResponse.json({
        success: true,
        message: 'Video queued for analysis',
        video_id: videoId,
        status: 'queued',
        queue_position: queuePosition,
        queue_stats: queueStats?.[0] || {
          queued_count: queuePosition,
          processing_count: 0,
          completed_today: 0,
          failed_today: 0,
          avg_processing_time: null
        }
      });

    } catch (error) {
      console.error('Error queuing video analysis:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}