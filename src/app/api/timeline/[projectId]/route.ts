import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Check authentication and get authenticated client
    const { user,  supabase } = await getUserFromRequest(request);
    console.log('🔍 Timeline GET - Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      projectId 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, let's check if the project exists at all
    const { data: allProjects, error: allProjectsError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId);

    console.log('🔍 Timeline GET - All projects with this ID:', { 
      projectId,
      allProjects,
      allProjectsError: allProjectsError?.message || allProjectsError?.code,
      count: allProjects?.length || 0
    });

    // Let's also check what projects this user actually has
    const { data: userProjects, error: userProjectsError } = await supabase
      .from('projects')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('🔍 Timeline GET - User\'s recent projects:', { 
      userId: user.id,
      userProjects,
      userProjectsError: userProjectsError?.message || userProjectsError?.code
    });

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Timeline GET - Project check:', { 
      projectId, 
      userId: user.id,
      hasProject: !!project, 
      projectError: projectError?.message || projectError?.code 
    });

    if (projectError || !project) {
      return NextResponse.json({ 
        error: 'Project not found',
        details: projectError?.message || 'No project data'
      }, { status: 404 });
    }

    // Get active timeline for this project
    const { data: timeline, error: timelineError } = await supabase
      .from('timeline_configurations')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .single();

    console.log('🔍 Timeline GET - Timeline check:', { 
      projectId, 
      hasTimeline: !!timeline,
      timelineError: timelineError?.message || timelineError?.code 
    });

    if (timelineError && timelineError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching timeline:', timelineError);
      return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
    }

    // If no timeline exists, return default structure
    if (!timeline) {
      console.log('📝 No timeline found for project, returning null');
      return NextResponse.json({
        timeline: null,
        message: 'No timeline found for this project'
      });
    }

    return NextResponse.json({
      timeline: {
        id: timeline.id,
        projectId: timeline.project_id,
        title: timeline.title,
        description: timeline.description,
        version: timeline.version,
        totalDuration: timeline.total_duration,
        frameRate: timeline.frame_rate,
        zoom: timeline.zoom,
        playheadPosition: timeline.playhead_position,
        pixelsPerFrame: timeline.pixels_per_frame,
        timelineData: timeline.timeline_data,
        status: timeline.status,
        createdAt: timeline.created_at,
        updatedAt: timeline.updated_at,
        lastSavedAt: timeline.last_saved_at,
      }
    });

  } catch (error) {
    console.error('Error in timeline GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Check authentication and get authenticated client
    const { user,  supabase } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Parse request body
    const body = await request.json();
    const {
      timelineData,
      totalDuration,
      frameRate,
      zoom,
      playheadPosition,
      status = 'auto_saved',
      title
    } = body;

    // Validate required fields
    if (!timelineData) {
      return NextResponse.json(
        { error: 'timelineData is required' },
        { status: 400 }
      );
    }

    // First, check if there's already an active timeline for this project
    const { data: existingTimeline, error: existingError } = await supabase
      .from('timeline_configurations')
      .select('id, version')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing timeline:', existingError);
      return NextResponse.json(
        { error: 'Failed to check existing timeline' },
        { status: 500 }
      );
    }

    let timelineId;

    if (existingTimeline) {
      // Update existing timeline
      const { data: updatedData, error: updateError } = await supabase
        .from('timeline_configurations')
        .update({
          timeline_data: timelineData,
          total_duration: totalDuration,
          frame_rate: frameRate,
          zoom: zoom,
          playhead_position: playheadPosition,
          status: status,
          title: title,
          updated_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString(),
          version: (existingTimeline.version || 1) + 1 // Increment version
        })
        .eq('id', existingTimeline.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Error updating timeline:', updateError);
        return NextResponse.json(
          { error: 'Failed to update timeline' },
          { status: 500 }
        );
      }

      timelineId = updatedData.id;
    } else {
      // Create new timeline
      const { data: newData, error: createError } = await supabase
        .from('timeline_configurations')
        .insert({
          project_id: projectId,
          user_id: user.id,
          timeline_data: timelineData,
          total_duration: totalDuration,
          frame_rate: frameRate,
          zoom: zoom,
          playhead_position: playheadPosition,
          status: status,
          title: title,
          is_active: true,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating timeline:', createError);
        return NextResponse.json(
          { error: 'Failed to create timeline' },
          { status: 500 }
        );
      }

      timelineId = newData.id;
    }

    // Fetch the updated timeline to return
    const { data: updatedTimeline, error: fetchError } = await supabase
      .from('timeline_configurations')
      .select('*')
      .eq('id', timelineId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated timeline:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated timeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      timeline: {
        id: updatedTimeline.id,
        projectId: updatedTimeline.project_id,
        title: updatedTimeline.title,
        description: updatedTimeline.description,
        version: updatedTimeline.version,
        totalDuration: updatedTimeline.total_duration,
        frameRate: updatedTimeline.frame_rate,
        zoom: updatedTimeline.zoom,
        playheadPosition: updatedTimeline.playhead_position,
        pixelsPerFrame: updatedTimeline.pixels_per_frame,
        timelineData: updatedTimeline.timeline_data,
        status: updatedTimeline.status,
        createdAt: updatedTimeline.created_at,
        updatedAt: updatedTimeline.updated_at,
        lastSavedAt: updatedTimeline.last_saved_at,
      },
      message: 'Timeline saved successfully'
    });

  } catch (error) {
    console.error('Error in timeline POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // PUT is the same as POST for timeline - we always upsert
  return POST(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Check authentication and get authenticated client
    const { user,  supabase } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Delete all timeline configurations for this project
    const { error: deleteError } = await supabase
      .from('timeline_configurations')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting timeline:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete timeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Timeline deleted successfully'
    });

  } catch (error) {
    console.error('Error in timeline DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}