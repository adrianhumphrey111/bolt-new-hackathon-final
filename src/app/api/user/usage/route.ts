import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's projects from Supabase
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, created_at')
      .eq('user_id', user.id);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Calculate usage statistics using the user_usage_stats view
    const { data: usageStats, error: usageError } = await supabase
      .from('user_usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching usage stats:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Use real data from the view, with fallbacks
    const usage = {
      videosCreated: usageStats?.videos_this_month || 0,
      videosLimit: 100, // Based on subscription plan - TODO: get from user's subscription
      storageUsed: usageStats?.total_storage_gb || 0,
      storageLimit: 2, // Based on subscription plan - TODO: get from user's subscription
      exportsThisMonth: usageStats?.exports_this_month || 0,
      minutesRendered: Math.round((usageStats?.minutes_rendered_this_month || 0) * 100) / 100, // Round to 2 decimal places
      totalProjects: projects?.length || 0,
      totalVideos: usageStats?.total_videos || 0,
      totalRenders: usageStats?.total_renders || 0,
      totalExports: usageStats?.total_exports || 0,
      totalMinutesRendered: Math.round((usageStats?.total_minutes_rendered || 0) * 100) / 100,
      totalStorageBytes: usageStats?.total_combined_storage_bytes || 0,
    };

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}