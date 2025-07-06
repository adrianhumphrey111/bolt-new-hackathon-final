import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '../../../../lib/supabase/service';

export async function GET(request: NextRequest) {
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


    console.log(`📊 Found ${videosNeedingAnalysis?.length || 0} videos needing analysis`);

    return NextResponse.json({
      videos: videosNeedingAnalysis || [],
      count: videosNeedingAnalysis?.length || 0
    });

  } catch (error) {
    console.error('Error getting videos needing reprocess:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}