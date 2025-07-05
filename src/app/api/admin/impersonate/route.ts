import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Get admin emails from environment variable
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

export async function POST(request: NextRequest) {
  try {
    const { targetUserEmail } = await request.json();

    if (!targetUserEmail) {
      return NextResponse.json({
        success: false,
        error: 'Target user email is required'
      }, { status: 400 });
    }

    // Get current user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid authorization header'
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token with Supabase
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Check if current user is an admin
    if (!ADMIN_EMAILS.includes(currentUser.email!)) {
      console.warn(`Unauthorized impersonation attempt by: ${currentUser.email}`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Find the target user
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return NextResponse.json({
        success: false,
        error: 'Failed to find user'
      }, { status: 500 });
    }

    const user = targetUser.users.find(u => u.email === targetUserEmail);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: `User with email ${targetUserEmail} not found`
      }, { status: 404 });
    }

    // Generate magic link first
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUserEmail,
    });

    if (magicLinkError || !magicLinkData?.properties?.hashed_token) {
      console.error('Error generating magic link:', magicLinkError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate magic link'
      }, { status: 500 });
    }

    // Verify the OTP to create a session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: magicLinkData.properties.hashed_token,
      type: 'email',
    });

    if (sessionError || !sessionData?.session) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create user session'
      }, { status: 500 });
    }

    // Create our own localhost URL with the session tokens
    const localhost_url = `http://localhost:3000/dashboard#access_token=${sessionData.session.access_token}&expires_at=${sessionData.session.expires_at}&expires_in=${sessionData.session.expires_in}&refresh_token=${sessionData.session.refresh_token}&token_type=bearer&type=recovery`;

    const finalTokenData = {
      properties: {
        action_link: localhost_url
      }
    };

    // Remove the old tokenError check since we're not using generateLink anymore

    // Log the impersonation attempt for security
    console.log(`🔒 ADMIN IMPERSONATION: ${currentUser.email} impersonating ${targetUserEmail} at ${new Date().toISOString()}`);

    // Store impersonation info in database for audit trail
    await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_user_id: currentUser.id,
        admin_email: currentUser.email,
        action_type: 'impersonate_user',
        target_user_email: targetUserEmail,
        target_user_id: user.id,
        created_at: new Date().toISOString(),
        metadata: {
          user_agent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        }
      });

    return NextResponse.json({
      success: true,
      impersonationUrl: finalTokenData.properties?.action_link,
      targetUser: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Admin impersonation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}