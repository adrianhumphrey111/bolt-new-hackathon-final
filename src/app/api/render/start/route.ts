import { NextRequest, NextResponse } from 'next/server';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { TimelineState } from '../../../../../types/timeline';
import { getUserFromRequest } from '@/lib/supabase/server';

// AWS Configuration
const LAMBDA_FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.REMOTION_S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { composition, timelineState, outputFormat, quality, projectId } = body;

    // Auth check
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user || !supabase) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    if (!LAMBDA_FUNCTION_NAME || !REMOTION_SERVE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Lambda configuration missing. Please contact support.',
      });
    }

    // Map quality to codec settings
    const codecSettings = {
      low: { crf: 28, scale: 0.75 },
      medium: { crf: 23, scale: 1 },
      high: { crf: 18, scale: 1 },
    };

    const settings = codecSettings[quality as keyof typeof codecSettings];

    // Extract video IDs from timeline state
    const videoIds: string[] = [];
    timelineState.tracks.forEach(track => {
      track.items.forEach(item => {
        if (item.type === 'video' && item.src) {
          // Extract video ID from URL or use the src as ID
          const videoId = item.src.split('/').pop()?.split('.')[0] || item.id;
          if (!videoIds.includes(videoId)) {
            videoIds.push(videoId);
          }
        }
      });
    });

    // Calculate duration in milliseconds
    const durationMs = Math.round((timelineState.totalDuration / timelineState.fps) * 1000);

    // Store render job in database
    const renderRecord = await supabase
      .from('renders')
      .insert({
        user_id: user.id,
        project_id: projectId,
        video_ids: videoIds.length > 0 ? videoIds : ['timeline-composition'], // Fallback if no videos
        duration_ms: durationMs,
        fps: timelineState.fps,
        status: 'starting',
        quality,
        format: outputFormat,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!renderRecord.data) {
      throw new Error('Failed to create render record');
    }

    // Start Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: AWS_REGION as any,
      functionName: LAMBDA_FUNCTION_NAME,
      composition,
      serveUrl: REMOTION_SERVE_URL,
      codec: outputFormat === 'mp4' ? 'h264' : 'h265',
      inputProps: {
        timelineState,
        projectId,
        userId: user.id,
        renderJobId: renderRecord.data.id,
      },
      imageFormat: 'jpeg',
      crf: settings.crf,
      scale: settings.scale,
      maxRetries: 1, // Reduce retries due to low concurrency limit
      privacy: 'public',
      outName: `${user.id}/${projectId}-${Date.now()}.${outputFormat}`,
      // Set concurrency for current Lambda limits
      concurrencyPerLambda: 1,
      downloadBehavior: {
        type: 'download',
        fileName: `${projectId}-render.${outputFormat}`
      }, // Enable direct download with filename
    });

    // Update render record with Lambda info
    await supabase
      .from('renders')
      .update({
        render_id: renderId,
        bucket_name: bucketName,
        status: 'rendering',
      })
      .eq('id', renderRecord.data.id);

    return NextResponse.json({
      success: true,
      renderId,
      bucketName,
      jobId: renderRecord.data.id,
    });
  } catch (error) {
    console.error('Render start error:', error);
    
    // Handle specific AWS concurrency errors
    if (error instanceof Error && error.message.includes('Rate Exceeded')) {
      return NextResponse.json({
        success: false,
        error: 'Rendering service is currently at capacity. Please try again in a few minutes.',
      });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start render',
    });
  }
}