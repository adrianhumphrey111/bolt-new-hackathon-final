import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';

// PATCH /api/renders/:renderId - Update render status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { renderId } = await params;
    const body = await request.json();
    const { status, errorMessage } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

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

    if (!render) {
      return NextResponse.json({ error: 'Render not found' }, { status: 404 });
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

// GET /api/renders/:renderId - Get specific render
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { user,  supabase } = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { renderId } = await params;

    const { data: render, error: fetchError } = await supabase
      .from('renders')
      .select('*')
      .eq('id', renderId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching render:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch render' }, { status: 500 });
    }

    if (!render) {
      return NextResponse.json({ error: 'Render not found' }, { status: 404 });
    }

    return NextResponse.json(render);
  } catch (error) {
    console.error('Render fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}