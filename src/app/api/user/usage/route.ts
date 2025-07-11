import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
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

    // Get user's subscription tier to determine storage limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    // Determine storage limit based on subscription tier
    const subscriptionTier = profile?.subscription_tier || 'free';
    let storageLimit = 2; // Default for free tier (2GB)
    
    if (subscriptionTier === 'creator') {
      storageLimit = 10; // 10GB for Creator tier
    } else if (subscriptionTier === 'pro') {
      storageLimit = 50; // 50GB for Pro tier
    }

    // Use real data from the view, with fallbacks
    const usage = {
      videosCreated: usageStats?.videos_this_month || 0,
      videosLimit: 100, // Based on subscription plan
      storageUsed: usageStats?.total_storage_gb || 0,
      storageLimit, // Now dynamically set based on subscription
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