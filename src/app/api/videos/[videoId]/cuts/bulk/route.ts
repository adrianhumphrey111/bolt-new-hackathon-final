import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../../lib/supabase/server'

interface BulkOperationRequest {
  operationType: 'smart_cleanup' | 'manual_selection' | 'restore_all'
  cutIds?: string[]
  userPrompt?: string
  cutTypes?: string[]
  confidenceThreshold?: number
}

interface BulkOperationResponse {
  success: boolean
  operationId: string
  cutsAffected: number
  timeSavedSeconds: number
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const body: BulkOperationRequest = await request.json()
    const { operationType, cutIds, userPrompt, cutTypes, confidenceThreshold } = body

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

    // Generate bulk operation ID
    const bulkOperationId = crypto.randomUUID()

    let cutsAffected = 0
    let timeSavedSeconds = 0
    let affectedCutIds: string[] = []

    if (operationType === 'restore_all') {
      // Restore all active cuts
      const { data: activeCuts, error: fetchError } = await supabase
        .from('video_cuts')
        .select('id, source_start, source_end')
        .eq('video_id', videoId)
        .eq('is_active', true)

      if (fetchError) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch active cuts' },
          { status: 500 }
        )
      }

      if (activeCuts && activeCuts.length > 0) {
        affectedCutIds = activeCuts.map(cut => cut.id)
        timeSavedSeconds = activeCuts.reduce((acc, cut) => 
          acc + (cut.source_end - cut.source_start), 0
        )

        const { error: updateError } = await supabase
          .from('video_cuts')
          .update({
            is_active: false,
            bulk_operation_id: bulkOperationId,
            updated_at: new Date().toISOString()
          })
          .eq('video_id', videoId)
          .in('id', affectedCutIds)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to restore cuts' },
            { status: 500 }
          )
        }

        cutsAffected = activeCuts.length
      }

    } else if (operationType === 'manual_selection' && cutIds) {
      // Apply specific cuts
      const { data: selectedCuts, error: fetchError } = await supabase
        .from('video_cuts')
        .select('id, source_start, source_end, is_active')
        .eq('video_id', videoId)
        .in('id', cutIds)

      if (fetchError) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch selected cuts' },
          { status: 500 }
        )
      }

      if (selectedCuts && selectedCuts.length > 0) {
        affectedCutIds = selectedCuts.map(cut => cut.id)
        timeSavedSeconds = selectedCuts
          .filter(cut => !cut.is_active) // Only count cuts being activated
          .reduce((acc, cut) => acc + (cut.source_end - cut.source_start), 0)

        const { error: updateError } = await supabase
          .from('video_cuts')
          .update({
            is_active: true,
            bulk_operation_id: bulkOperationId,
            updated_at: new Date().toISOString()
          })
          .eq('video_id', videoId)
          .in('id', cutIds)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to apply cuts' },
            { status: 500 }
          )
        }

        cutsAffected = selectedCuts.length
      }

    } else if (operationType === 'smart_cleanup') {
      // Apply cuts based on criteria
      let query = supabase
        .from('video_cuts')
        .select('id, source_start, source_end, cut_type, confidence')
        .eq('video_id', videoId)
        .eq('is_active', false)

      if (cutTypes && cutTypes.length > 0) {
        query = query.in('cut_type', cutTypes)
      }

      if (confidenceThreshold !== undefined) {
        query = query.gte('confidence', confidenceThreshold)
      }

      const { data: eligibleCuts, error: fetchError } = await query

      if (fetchError) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch eligible cuts' },
          { status: 500 }
        )
      }

      if (eligibleCuts && eligibleCuts.length > 0) {
        affectedCutIds = eligibleCuts.map(cut => cut.id)
        timeSavedSeconds = eligibleCuts.reduce((acc, cut) => 
          acc + (cut.source_end - cut.source_start), 0
        )

        const { error: updateError } = await supabase
          .from('video_cuts')
          .update({
            is_active: true,
            bulk_operation_id: bulkOperationId,
            updated_at: new Date().toISOString()
          })
          .eq('video_id', videoId)
          .in('id', affectedCutIds)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to apply smart cleanup' },
            { status: 500 }
          )
        }

        cutsAffected = eligibleCuts.length
      }
    }

    // Record the bulk operation
    const { error: operationError } = await supabase
      .from('video_cut_operations')
      .insert({
        id: bulkOperationId,
        video_id: videoId,
        operation_type: operationType,
        user_prompt: userPrompt,
        cut_types: cutTypes,
        confidence_threshold: confidenceThreshold,
        cuts_created: cutsAffected,
        time_saved_seconds: timeSavedSeconds,
        created_by: user.id
      })

    if (operationError) {
      console.error('Error recording bulk operation:', operationError)
      // Don't fail the request, just log the error
    }

    const response: BulkOperationResponse = {
      success: true,
      operationId: bulkOperationId,
      cutsAffected,
      timeSavedSeconds
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params

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

    // Get bulk operations for this video
    const { data: operations, error: operationsError } = await supabase
      .from('video_cut_operations')
      .select(`
        id,
        operation_type,
        user_prompt,
        cut_types,
        confidence_threshold,
        cuts_created,
        time_saved_seconds,
        created_at
      `)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })

    if (operationsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch operations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      operations: operations || []
    })

  } catch (error) {
    console.error('Get bulk operations error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}