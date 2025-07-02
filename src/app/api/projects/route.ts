import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get authenticated client
    const { user,  supabase } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get projects with videos for this user
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        videos (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return NextResponse.json({
      projects: projects || []
    });

  } catch (error) {
    console.error('Error in projects GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get authenticated client
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user || !supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || !title.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project title is required' 
      }, { status: 400 });
    }

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        user_id: user.id,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
      return NextResponse.json({ 
        success: false, 
        error: createError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Error in projects POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}