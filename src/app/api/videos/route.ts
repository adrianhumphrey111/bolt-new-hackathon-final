import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get authenticated client
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project_id from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get videos for the project with analysis data
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*, video_analysis(id, status, processing_started_at, processing_completed_at)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (videosError) {
      console.error('Error fetching videos:', videosError);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    return NextResponse.json({
      videos: videos || []
    });

  } catch (error) {
    console.error('Error in videos GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}