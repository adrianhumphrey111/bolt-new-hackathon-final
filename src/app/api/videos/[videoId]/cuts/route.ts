import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/supabase/server'

interface CutManagementRequest {
  cutIds: string[]
  isActive: boolean
  bulkOperationId?: string
}

interface CutResponse {
  success: boolean
  cutsModified: number
  error?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const url = new URL(request.url)
    const isActive = url.searchParams.get('active')

    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, projects!inner(user_id)')
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'Video not found or not authorized' },
        { status: 404 }
      )
    }

    // Build query
    let query = supabase
      .from('video_cuts')
      .select(`
        id,
        source_start,
        source_end,
        cut_type,
        confidence,
        reasoning,
        affected_text,
        is_active,
        bulk_operation_id,
        created_at
      `)
      .eq('video_id', videoId)
      .order('source_start', { ascending: true })

    // Filter by active status if specified
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: cuts, error: cutsError } = await query

    if (cutsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cuts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cuts: cuts || []
    })

  } catch (error) {
    console.error('Get cuts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const body: CutManagementRequest = await request.json()
    const { cutIds, isActive, bulkOperationId } = body

    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, projects!inner(user_id)')
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'Video not found or not authorized' },
        { status: 404 }
      )
    }

    if (!cutIds || cutIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No cut IDs provided' },
        { status: 400 }
      )
    }

    // Update cuts
    const updateData: any = {
      is_active: isActive,
      updated_at: new Date().toISOString()
    }

    if (bulkOperationId) {
      updateData.bulk_operation_id = bulkOperationId
    }

    const { data, error: updateError } = await supabase
      .from('video_cuts')
      .update(updateData)
      .eq('video_id', videoId)
      .in('id', cutIds)
      .select('id')

    if (updateError) {
      console.error('Error updating cuts:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update cuts' },
        { status: 500 }
      )
    }

    const response: CutResponse = {
      success: true,
      cutsModified: data?.length || 0
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Cut management error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const url = new URL(request.url)
    const cutIds = url.searchParams.get('cutIds')?.split(',') || []

    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, projects!inner(user_id)')
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'Video not found or not authorized' },
        { status: 404 }
      )
    }

    if (cutIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No cut IDs provided' },
        { status: 400 }
      )
    }

    // Delete cuts
    const { data, error: deleteError } = await supabase
      .from('video_cuts')
      .delete()
      .eq('video_id', videoId)
      .in('id', cutIds)
      .select('id')

    if (deleteError) {
      console.error('Error deleting cuts:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete cuts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cutsDeleted: data?.length || 0
    })

  } catch (error) {
    console.error('Delete cuts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}