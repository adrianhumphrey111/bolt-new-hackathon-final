import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../../lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify the user owns this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the latest EDL generation job for this project
    const { data: edlJob, error: edlError } = await supabase
      .from('edl_generation_jobs')
      .select('edl_document, created_at, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (edlError && edlError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching EDL document:', edlError);
      return NextResponse.json({ error: 'Failed to fetch EDL document' }, { status: 500 });
    }

    if (!edlJob || !edlJob.edl_document) {
      return NextResponse.json({ 
        error: 'No EDL document found for this project',
        hasEDL: false 
      }, { status: 404 });
    }

    return NextResponse.json({
      edlDocument: edlJob.edl_document,
      createdAt: edlJob.created_at,
      status: edlJob.status,
      hasEDL: true
    });

  } catch (error) {
    console.error('EDL document fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}