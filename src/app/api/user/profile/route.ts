import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user data from Supabase auth
    const userData = {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      email: user.email,
      image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      createdAt: user.created_at,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    // Update user metadata in Supabase
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email: email,
      user_metadata: {
        full_name: name,
        name: name,
      }
    });

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    const updatedUser = {
      id: data.user.id,
      name: data.user.user_metadata?.full_name || name,
      email: data.user.email,
      image: data.user.user_metadata?.avatar_url || null,
    };

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}