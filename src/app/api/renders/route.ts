import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/supabase/server';

// POST /api/renders - Track a new render
export async function POST(request: NextRequest) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      videoIds,
      durationMs,
      fps = 30,
      resolution = '1920x1080',
      format = 'mp4'
    } = body;

    if (!projectId || !videoIds || !durationMs) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, videoIds, durationMs' 
      }, { status: 400 });
    }

    // Create render record
    const { data: render, error: renderError } = await supabase
      .from('renders')
      .insert({
        project_id: projectId,
        user_id: user.id,
        video_ids: videoIds,
        duration_ms: durationMs,
        fps,
        resolution,
        format,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (renderError) {
      console.error('Error creating render:', renderError);
      return NextResponse.json({ error: 'Failed to create render record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      renderId: render.id,
      render
    });
  } catch (error) {
    console.error('Render tracking error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH /api/renders/:renderId - Update render status
export async function PATCH(request: NextRequest) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const renderId = url.pathname.split('/').pop();

    if (!renderId || renderId === 'renders') {
      return NextResponse.json({ error: 'Render ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { status, errorMessage } = body;

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (status === 'failed' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Update render record
    const { data: render, error: updateError } = await supabase
      .from('renders')
      .update(updateData)
      .eq('id', renderId)
      .eq('user_id', user.id) // Ensure user owns this render
      .select()
      .single();

    if (updateError) {
      console.error('Error updating render:', updateError);
      return NextResponse.json({ error: 'Failed to update render' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      render
    });
  } catch (error) {
    console.error('Render update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/renders - Get user's renders
export async function GET(request: NextRequest) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('renders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: renders, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching renders:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch renders' }, { status: 500 });
    }

    return NextResponse.json({
      renders: renders || [],
      total: renders?.length || 0
    });
  } catch (error) {
    console.error('Render fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}