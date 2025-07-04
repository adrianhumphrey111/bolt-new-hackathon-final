import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '../../../../lib/supabase/service';

// Maximum concurrent video processing
const MAX_CONCURRENT_PROCESSING = 3;

// Lambda URL
const LAMBDA_URL = 'https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio';

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  try {
    console.log('🔄 Starting video queue processing cron job');

    // Get currently processing videos count
    const { data: processingVideos, error: processingError } = await supabase
      .from('video_analysis')
      .select('id')
      .eq('status', 'processing');

    if (processingError) {
      console.error('Error checking processing videos:', processingError);
      return NextResponse.json({ error: 'Failed to check processing videos' }, { status: 500 });
    }

    const currentlyProcessing = processingVideos?.length || 0;
    const slotsAvailable = MAX_CONCURRENT_PROCESSING - currentlyProcessing;

    console.log(`📊 Currently processing: ${currentlyProcessing}, Slots available: ${slotsAvailable}`);

    if (slotsAvailable <= 0) {
      return NextResponse.json({
        message: 'All processing slots are full',
        processing: currentlyProcessing,
        max_concurrent: MAX_CONCURRENT_PROCESSING
      });
    }

    // Get next videos from queue
    const { data: queuedVideos, error: queueError } = await supabase
      .from('video_analysis')
      .select(`
        id,
        video_id,
        project_id,
        user_id,
        queue_position,
        retry_count,
        videos!inner(
          file_path,
          original_name
        )
      `)
      .eq('status', 'queued')
      .order('queue_position', { ascending: true })
      .limit(slotsAvailable);

    if (queueError) {
      console.error('Error fetching queued videos:', queueError);
      return NextResponse.json({ error: 'Failed to fetch queued videos' }, { status: 500 });
    }

    if (!queuedVideos || queuedVideos.length === 0) {
      return NextResponse.json({
        message: 'No videos in queue',
        processing: currentlyProcessing
      });
    }

    console.log(`🎬 Processing ${queuedVideos.length} videos from queue`);

    const processedVideos = [];
    const errors = [];

    // Process each video
    for (const video of queuedVideos) {
      try {
        // Update status to processing
        const { error: updateError } = await supabase
          .from('video_analysis')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', video.id);

        if (updateError) {
          console.error(`Error updating video ${video.video_id} to processing:`, updateError);
          errors.push({ video_id: video.video_id, error: updateError.message });
          continue;
        }

        // Check if storyboard content exists
        const { data: storyboardContent } = await supabase
          .from('storyboard_content')
          .select('text_content')
          .eq('project_id', video.project_id)
          .single();

        // Prepare Lambda payload
        const lambdaPayload = {
          video_id: video.video_id,
          project_id: video.project_id,
          additional_context: '',
          storyboard_content: storyboardContent?.text_content || '',
          has_storyboard: !!storyboardContent,
          trigger_source: 'queue_processor',
          retry_count: video.retry_count
        };

        console.log(`🚀 Triggering Lambda for video ${video.video_id}`);

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
          console.error(`Lambda invocation failed for ${video.video_id}:`, lambdaResponse.status, errorText);
          
          // Update status to failed if max retries reached
          if (video.retry_count >= 2) {
            await supabase
              .from('video_analysis')
              .update({
                status: 'failed',
                error_message: `Lambda invocation failed after ${video.retry_count + 1} attempts: ${errorText}`,
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', video.id);
          } else {
            // Requeue with incremented retry count
            await supabase
              .from('video_analysis')
              .update({
                status: 'queued',
                retry_count: video.retry_count + 1,
                error_message: `Lambda invocation failed, will retry: ${errorText}`
              })
              .eq('id', video.id);
          }
          
          errors.push({ video_id: video.video_id, error: `Lambda returned ${lambdaResponse.status}` });
        } else {
          console.log(`✅ Lambda triggered successfully for ${video.video_id}`);
          processedVideos.push(video.video_id);
        }

      } catch (error) {
        console.error(`Error processing video ${video.video_id}:`, error);
        
        // Update retry count or mark as failed
        if (video.retry_count >= 2) {
          await supabase
            .from('video_analysis')
            .update({
              status: 'failed',
              error_message: `Processing failed after ${video.retry_count + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
              processing_completed_at: new Date().toISOString()
            })
            .eq('id', video.id);
        } else {
          await supabase
            .from('video_analysis')
            .update({
              status: 'queued',
              retry_count: video.retry_count + 1,
              error_message: `Processing error, will retry: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
            .eq('id', video.id);
        }
        
        errors.push({
          video_id: video.video_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Get updated queue stats
    const { data: queueStats } = await supabase
      .rpc('get_queue_stats');

    return NextResponse.json({
      success: true,
      processed: processedVideos.length,
      errors: errors.length,
      details: {
        processed_videos: processedVideos,
        errors: errors
      },
      queue_stats: queueStats?.[0] || {}
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}