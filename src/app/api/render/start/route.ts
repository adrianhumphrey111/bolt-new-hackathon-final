import { NextRequest, NextResponse } from 'next/server';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { TimelineState } from '../../../../../types/timeline';
import { getUserFromRequest } from '@/lib/supabase/server';
import { DURATION_IN_FRAMES } from '../../../../../types/constants';

// AWS Configuration
const LAMBDA_FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.REMOTION_S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { composition, timelineState, outputFormat, quality, projectId } = body;

    // 🔍 DETAILED LOGGING - Timeline State Analysis
    console.log('🎬 RENDER START - Full Request Body:', JSON.stringify(body, null, 2));
    console.log('🎬 RENDER START - Timeline State Details:', {
      totalDuration: timelineState?.totalDuration,
      fps: timelineState?.fps,
      tracksCount: timelineState?.tracks?.length || 0,
      playheadPosition: timelineState?.playheadPosition,
      zoom: timelineState?.zoom,
      selectedItems: timelineState?.selectedItems,
      isPlaying: timelineState?.isPlaying,
    });

    // Log each track and its items
    timelineState?.tracks?.forEach((track, index) => {
      console.log(`🎬 RENDER START - Track ${index + 1} (${track.id}):`, {
        name: track.name,
        itemsCount: track.items?.length || 0,
        transitionsCount: track.transitions?.length || 0,
        items: track.items?.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          startTime: item.startTime,
          duration: item.duration,
          hasSrc: !!item.src,
          src: item.src ? item.src.substring(0, 50) + '...' : 'NO SRC',
        })) || [],
      });
    });

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

    // Calculate actual duration from timeline items (like the composition does)
    const allItems = timelineState.tracks.flatMap(track => track.items);
    const actualDuration = allItems.length > 0 ? Math.max(...allItems.map(item => item.startTime + item.duration)) : timelineState.totalDuration;
    const durationMs = Math.round((actualDuration / timelineState.fps) * 1000);
    
    console.log('🎬 RENDER START - Duration Calculation:', {
      originalTotalDuration: timelineState.totalDuration,
      calculatedActualDuration: actualDuration,
      itemsCount: allItems.length,
      fps: timelineState.fps,
      durationSeconds: actualDuration / timelineState.fps,
      durationMs: durationMs,
    });

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
    console.log('🎬 RENDER START - Starting Lambda render with inputProps:', {
      timelineState: {
        totalDuration: timelineState.totalDuration,
        fps: timelineState.fps,
        tracksCount: timelineState.tracks?.length || 0,
        itemsCount: timelineState.tracks?.reduce((sum, track) => sum + (track.items?.length || 0), 0) || 0,
      },
      projectId,
      userId: user.id,
      renderJobId: renderRecord.data.id,
    });

    console.log('🎬 RENDER START - Lambda parameters:', {
      composition,
      actualDuration,
      timelineStateKeys: Object.keys(timelineState),
    });

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: AWS_REGION as any,
      functionName: LAMBDA_FUNCTION_NAME,
      composition,
      serveUrl: REMOTION_SERVE_URL,
      codec: outputFormat === 'mp4' ? 'h264' : 'h265',
      inputProps: {
        timelineState: {
          ...timelineState,
          calculatedDuration: actualDuration, // Add the calculated duration to props
        },
        projectId,
        userId: user.id,
        renderJobId: renderRecord.data.id,
      },
      imageFormat: 'jpeg',
      crf: settings.crf,
      scale: settings.scale,
      maxRetries: 0, // Reduce retries due to low concurrency limit
      privacy: 'public',
      outName: `${user.id}/${projectId}-${Date.now()}.${outputFormat}`,
      // Set concurrency for current Lambda limits
      concurrencyPerLambda: 1,
      framesPerLambda:500,
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