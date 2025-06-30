import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/supabase/server';

// POST /api/exports - Track a new export
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      renderId,
      exportType = 'download',
      fileSizeBytes,
      filePath,
      metadata = {}
    } = body;

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing required field: projectId' 
      }, { status: 400 });
    }

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        render_id: renderId || null,
        export_type: exportType,
        file_size_bytes: fileSizeBytes || null,
        file_path: filePath || null,
        metadata
      })
      .select()
      .single();

    if (exportError) {
      console.error('Error creating export:', exportError);
      return NextResponse.json({ error: 'Failed to create export record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
      export: exportRecord
    });
  } catch (error) {
    console.error('Export tracking error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/exports - Get user's exports
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const exportType = searchParams.get('exportType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('exports')
      .select(`
        *,
        renders (
          id,
          duration_seconds,
          duration_minutes,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (exportType) {
      query = query.eq('export_type', exportType);
    }

    const { data: exports, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching exports:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 });
    }

    return NextResponse.json({
      exports: exports || [],
      total: exports?.length || 0
    });
  } catch (error) {
    console.error('Export fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}