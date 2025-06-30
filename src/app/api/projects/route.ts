import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get authenticated client
    const { user, error: authError, supabase } = await getUserFromRequest(request);
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