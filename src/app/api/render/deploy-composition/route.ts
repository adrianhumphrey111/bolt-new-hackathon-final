import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/server';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.REMOTION_S3_BUCKET_NAME || 'remotionlambda-useast1-xu5qe6f0ka';
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timelineState, projectId } = body;

    // Auth check
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user || !supabase) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    console.log('🎬 DEPLOY COMPOSITION - Creating composition record for user:', {
      userId: user.id,
      projectId,
      timelineStateKeys: Object.keys(timelineState),
      tracksCount: timelineState?.tracks?.length || 0,
    });

    // We'll use the Timeline composition for all users
    const compositionName = 'Timeline';
    
    console.log('🎬 DEPLOY COMPOSITION - Using existing Timeline composition:', {
      compositionName,
      existingServeUrl: REMOTION_SERVE_URL,
    });

    // Use the existing deployed site (no need to redeploy)
    const serveUrl = REMOTION_SERVE_URL;

    // Extract video IDs from timeline state
    const videoIds: string[] = [];
    timelineState.tracks?.forEach(track => {
      track.items?.forEach(item => {
        if (item.type === 'video' && item.src) {
          // Extract video ID from URL or use the src as ID
          const videoId = item.src.split('/').pop()?.split('.')[0] || item.id;
          if (!videoIds.includes(videoId)) {
            videoIds.push(videoId);
          }
        }
      });
    });

    // Calculate duration for the record
    const allItems = timelineState.tracks?.flatMap(track => track.items || []) || [];
    const actualDuration = allItems.length > 0 ? Math.max(...allItems.map(item => item.startTime + item.duration)) : timelineState.totalDuration || 0;
    const durationMs = Math.round((actualDuration / (timelineState.fps || 30)) * 1000);

    // Store the composition info in database for tracking
    // We'll use the Timeline composition from the existing deployed site
    const deploymentRecord = await supabase
      .from('renders')
      .insert({
        user_id: user.id,
        project_id: projectId,
        composition_name: compositionName,
        serve_url: serveUrl, // Use the newly deployed site
        video_ids: videoIds.length > 0 ? videoIds : ['timeline-composition'], // Fallback if no videos
        duration_ms: durationMs,
        fps: timelineState.fps || 30,
        status: 'pending',
        quality: 'ultra', // Default quality
        format: 'mp4', // Default format
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!deploymentRecord.data) {
      throw new Error('Failed to create deployment record');
    }

    console.log('🎬 DEPLOY COMPOSITION - Composition record created:', {
      compositionName,
      deploymentId: deploymentRecord.data.id,
      serveUrl: REMOTION_SERVE_URL,
    });

    return NextResponse.json({
      success: true,
      compositionName, // Always 'Timeline'
      serveUrl, // Use the existing serve URL
      deploymentId: deploymentRecord.data.id,
    });

  } catch (error) {
    console.error('Deploy composition error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create composition record',
    });
  }
}