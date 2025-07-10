import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/supabase/server'

interface TimelineSegment {
  id: string
  sourceStart: number
  sourceEnd: number
  duration: number
  type: 'content' | 'cut'
  cutInfo?: {
    cutType: string
    reasoning: string
    confidence: number
  }
}

interface TimelineResponse {
  success: boolean
  originalDuration: number
  cleanDuration: number
  timeSaved: number
  segments: TimelineSegment[]
  activeCuts: number
  error?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify video ownership and get video info
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        duration,
        projects!inner(user_id),
        video_analysis!inner(
          transcription,
          status
        )
      `)
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'Video not found or not authorized' },
        { status: 404 }
      )
    }

    const analysis = Array.isArray(video.video_analysis) 
      ? video.video_analysis[0] 
      : video.video_analysis

    if (!analysis || analysis.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Video analysis not completed' },
        { status: 400 }
      )
    }

    // Get the video duration from transcript data
    const transcriptData = analysis.transcription
    const words = transcriptData?.words || []
    const originalDuration = words.length > 0 
      ? Math.max(...words.map((w: any) => w.end)) / 1000 
      : video.duration || 0

    // Get cuts for this video
    let cutsQuery = supabase
      .from('video_cuts')
      .select(`
        id,
        source_start,
        source_end,
        cut_type,
        confidence,
        reasoning,
        is_active
      `)
      .eq('video_id', videoId)
      .order('source_start', { ascending: true })

    if (!includeInactive) {
      cutsQuery = cutsQuery.eq('is_active', true)
    }

    const { data: cuts, error: cutsError } = await cutsQuery

    if (cutsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch cuts' },
        { status: 500 }
      )
    }

    const allCuts = cuts || []
    const activeCuts = allCuts.filter(cut => cut.is_active)

    // Generate timeline segments
    const segments: TimelineSegment[] = []
    let currentTime = 0

    // Sort active cuts by start time
    const sortedActiveCuts = activeCuts.sort((a, b) => a.source_start - b.source_start)

    // Process each cut and create segments
    for (const cut of sortedActiveCuts) {
      // Add content segment before the cut (if any)
      if (currentTime < cut.source_start) {
        segments.push({
          id: `content_${segments.length}`,
          sourceStart: currentTime,
          sourceEnd: cut.source_start,
          duration: cut.source_start - currentTime,
          type: 'content'
        })
      }

      // Add the cut segment (marked as removed)
      segments.push({
        id: `cut_${cut.id}`,
        sourceStart: cut.source_start,
        sourceEnd: cut.source_end,
        duration: cut.source_end - cut.source_start,
        type: 'cut',
        cutInfo: {
          cutType: cut.cut_type,
          reasoning: cut.reasoning,
          confidence: cut.confidence
        }
      })

      currentTime = Math.max(currentTime, cut.source_end)
    }

    // Add final content segment (if any)
    if (currentTime < originalDuration) {
      segments.push({
        id: `content_${segments.length}`,
        sourceStart: currentTime,
        sourceEnd: originalDuration,
        duration: originalDuration - currentTime,
        type: 'content'
      })
    }

    // Calculate durations
    const timeSaved = activeCuts.reduce((acc, cut) => 
      acc + (cut.source_end - cut.source_start), 0
    )
    const cleanDuration = originalDuration - timeSaved

    const response: TimelineResponse = {
      success: true,
      originalDuration,
      cleanDuration,
      timeSaved,
      segments,
      activeCuts: activeCuts.length
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Timeline generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const body = await request.json()
    const { exportFormat = 'edl' } = body

    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get timeline data
    const timelineResponse = await fetch(
      `${request.nextUrl.origin}/api/videos/${videoId}/timeline`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }
    )

    if (!timelineResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate timeline' },
        { status: 500 }
      )
    }

    const timelineData = await timelineResponse.json()

    if (!timelineData.success) {
      return NextResponse.json(
        { success: false, error: timelineData.error },
        { status: 500 }
      )
    }

    // Generate export based on format
    let exportData: any = {}

    if (exportFormat === 'edl') {
      // Generate EDL (Edit Decision List) format
      const edlLines: string[] = []
      edlLines.push('TITLE: Video Cut Timeline')
      edlLines.push('')

      let editNumber = 1
      for (const segment of timelineData.segments) {
        if (segment.type === 'content') {
          const startTC = formatTimecode(segment.sourceStart)
          const endTC = formatTimecode(segment.sourceEnd)
          edlLines.push(`${editNumber.toString().padStart(3, '0')}  AX       V     C        ${startTC} ${endTC} ${startTC} ${endTC}`)
          editNumber++
        }
      }

      exportData = {
        format: 'edl',
        content: edlLines.join('\n'),
        filename: `${videoId}_cuts.edl`
      }

    } else if (exportFormat === 'json') {
      // Generate JSON format
      exportData = {
        format: 'json',
        content: JSON.stringify(timelineData, null, 2),
        filename: `${videoId}_timeline.json`
      }

    } else if (exportFormat === 'csv') {
      // Generate CSV format
      const csvLines: string[] = []
      csvLines.push('Type,Start Time,End Time,Duration,Cut Type,Reasoning,Confidence')
      
      for (const segment of timelineData.segments) {
        const row = [
          segment.type,
          segment.sourceStart.toFixed(3),
          segment.sourceEnd.toFixed(3),
          segment.duration.toFixed(3),
          segment.cutInfo?.cutType || '',
          segment.cutInfo?.reasoning || '',
          segment.cutInfo?.confidence?.toFixed(3) || ''
        ]
        csvLines.push(row.map(field => `"${field}"`).join(','))
      }

      exportData = {
        format: 'csv',
        content: csvLines.join('\n'),
        filename: `${videoId}_timeline.csv`
      }
    }

    return NextResponse.json({
      success: true,
      export: exportData,
      stats: {
        originalDuration: timelineData.originalDuration,
        cleanDuration: timelineData.cleanDuration,
        timeSaved: timelineData.timeSaved,
        segments: timelineData.segments.length,
        activeCuts: timelineData.activeCuts
      }
    })

  } catch (error) {
    console.error('Timeline export error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to format time as timecode (HH:MM:SS:FF)
function formatTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30) // Assuming 30fps

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}