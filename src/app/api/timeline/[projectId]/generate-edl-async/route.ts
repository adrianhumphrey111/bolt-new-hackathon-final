import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/supabase/server'
import { withCreditsCheck, useCredits } from '../../../../../lib/credits'

// POST /api/timeline/[projectId]/generate-edl-async - Start async EDL generation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withCreditsCheck(request, 'ai_generate', async (userId, supabase) => {
    try {

    const { projectId } = await params
    const { userIntent, scriptContent } = await request.json()

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, title')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if there's already a running job for this project
    const { data: existingJob } = await supabase
      .from('edl_generation_jobs')
      .select('id, status, created_at')
      .eq('project_id', projectId)
      .eq('status', 'running')
      .single()

    if (existingJob) {
      return NextResponse.json({
        error: 'EDL generation already in progress',
        jobId: existingJob.id,
        status: 'running'
      }, { status: 409 })
    }

    // Create new EDL generation job
    const { data: newJob, error: jobError } = await supabase
      .from('edl_generation_jobs')
      .insert({
        project_id: projectId,
        user_id: userId,
        user_intent: userIntent,
        script_content: scriptContent || '',
        status: 'pending',
        current_step: 'initializing',
        total_steps: 5
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating EDL job:', jobError)
      return NextResponse.json({ error: 'Failed to create EDL job' }, { status: 500 })
    }

    // Initialize the steps
    const steps = [
      { step_number: 1, agent_name: 'SCRIPT_ANALYZER', step_name: 'Script Analysis' },
      { step_number: 2, agent_name: 'CONTENT_MATCHER', step_name: 'Content Matching' },
      { step_number: 3, agent_name: 'SEQUENCE_OPTIMIZER', step_name: 'Sequence Optimization' },
      { step_number: 4, agent_name: 'SHOT_LIST_GENERATOR', step_name: 'Shot List Generation' },
      { step_number: 5, agent_name: 'TIMELINE_GENERATOR', step_name: 'Timeline Generation' }
    ]

    const { error: stepsError } = await supabase
      .from('edl_generation_steps')
      .insert(
        steps.map(step => ({
          job_id: newJob.id,
          ...step,
          status: 'pending'
        }))
      )

    if (stepsError) {
      console.error('Error creating EDL steps:', stepsError)
      // Continue anyway - steps can be created later
    }

    // Prepare Lambda payload with complete video data
    const lambdaPayload = {
      project_id: projectId,
      job_id: newJob.id,
      user_intent: userIntent,
      script_content: scriptContent || '',
    }

    // Update job status to running
    await supabase
      .from('edl_generation_jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        current_step: 'Script Analysis'
      })
      .eq('id', newJob.id)

    console.log('Starting async Lambda invocation for job:', newJob.id)

    // Start Lambda function asynchronously (fire and forget)
    const lambdaEndpoint = process.env.EDL_LAMBDA_ENDPOINT || 'https://k33p70crvd.execute-api.us-east-1.amazonaws.com/default/createEditDecisionListSummary'
    
    // Fire Lambda request and immediately return job info (don't wait for Lambda response)
    setImmediate(() => {
      fetch(lambdaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lambdaPayload),
      }).then(async (lambdaResponse) => {
      // Handle the response asynchronously
      try {
        if (!lambdaResponse.ok) {
          console.warn(`Lambda API returned ${lambdaResponse.status}, but Lambda may have processed successfully. Checking job status...`)
          
          // Don't immediately fail - Lambda might have processed successfully despite API Gateway error
          // Let polling handle the status check
          return
        }

        const edlResponse = await lambdaResponse.json()
        
        // Update the job with results
        const updateData: Record<string, any> = {
          status: edlResponse.status === 'success' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          raw_lambda_response: edlResponse
        }

        if (edlResponse.status === 'success') {
          updateData.script_segments = edlResponse.multi_agent_workflow_result?.final_outputs?.script_segments || []
          updateData.content_matches = edlResponse.multi_agent_workflow_result?.final_outputs?.content_matches || {}
          updateData.optimized_sequence = edlResponse.multi_agent_workflow_result?.final_outputs?.optimized_sequence || []
          updateData.shot_list = edlResponse.multi_agent_workflow_result?.final_outputs?.shot_list || []
          updateData.edl_document = edlResponse.multi_agent_workflow_result?.final_outputs?.edl_document
          updateData.shotstack_json = edlResponse.multi_agent_workflow_result?.final_outputs?.shotstack_json || {}
          updateData.final_video_duration = edlResponse.final_video_duration
          updateData.script_coverage_percentage = edlResponse.multi_agent_workflow_result?.final_outputs?.script_coverage_percentage
          updateData.total_chunks_count = edlResponse.total_available_chunks
        } else {
          updateData.error_message = edlResponse.error || 'Unknown error'
        }

        await supabase
          .from('edl_generation_jobs')
          .update(updateData)
          .eq('id', newJob.id)

      } catch (error) {
        console.error('Error processing Lambda response:', error)
        // Update job as failed
        await supabase
          .from('edl_generation_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_step: 'lambda_execution'
          })
          .eq('id', newJob.id)
      }
    }).catch(async (error) => {
      console.error('Error calling Lambda:', error)
      
      // Don't immediately mark as failed - Lambda might have processed successfully
      // despite network/API Gateway issues. Let polling handle status detection.
      console.log('Lambda invocation had network error, but Lambda may have processed successfully. Polling will handle status updates.')
    })
    }) // Close setImmediate callback

    // Use credits after Lambda has been triggered
    const creditsUsed = await useCredits(userId, 'ai_generate', {
      projectId,
      jobId: newJob.id,
      projectTitle: project.title,
      userIntent: userIntent?.substring(0, 100)
    }, supabase);

    if (!creditsUsed) {
      console.error('Failed to deduct credits for AI generation');
    }

    // Return immediately with job info (don't wait for Lambda)
    return NextResponse.json({
      success: true,
      jobId: newJob.id,
      status: 'running',
      message: 'EDL generation started successfully',
      estimatedDuration: '2-3 minutes'
    })

  } catch (error) {
    console.error('EDL generation start error:', error)
    return NextResponse.json({ 
      error: 'Failed to start EDL generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
  });
}

// GET /api/timeline/[projectId]/generate-edl-async - Get EDL generation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    let query = supabase
      .from('edl_generation_jobs')
      .select(`
        id,
        status,
        current_step,
        completed_steps,
        total_steps,
        created_at,
        started_at,
        completed_at,
        error_message,
        error_step,
        final_video_duration,
        script_coverage_percentage,
        total_chunks_count,
        shot_list,
        edl_generation_steps (
          step_number,
          agent_name,
          step_name,
          status,
          started_at,
          completed_at,
          duration_seconds,
          error_message
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (jobId) {
      query = query.eq('id', jobId)
    }

    const { data: jobs, error: jobError } = await query.limit(1).single()

    if (jobError || !jobs) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Calculate progress percentage
    const progressPercentage = jobs.total_steps > 0 
      ? Math.round((jobs.completed_steps / jobs.total_steps) * 100)
      : 0

    // Determine if job is complete and ready for timeline creation
    const isComplete = jobs.status === 'completed'
    const canCreateTimeline = isComplete && jobs.shot_list && Array.isArray(jobs.shot_list) && jobs.shot_list.length > 0

    // Sort steps by step_number to ensure correct order
    const sortedSteps = (jobs.edl_generation_steps || []).sort((a, b) => a.step_number - b.step_number)

    return NextResponse.json({
      jobId: jobs.id,
      status: jobs.status,
      currentStep: jobs.current_step,
      progress: {
        completed: jobs.completed_steps || 0,
        total: jobs.total_steps || 5,
        percentage: progressPercentage
      },
      timing: {
        createdAt: jobs.created_at,
        startedAt: jobs.started_at,
        completedAt: jobs.completed_at
      },
      error: jobs.error_message ? {
        message: jobs.error_message,
        step: jobs.error_step
      } : null,
      results: isComplete ? {
        finalDuration: jobs.final_video_duration,
        scriptCoverage: jobs.script_coverage_percentage,
        totalChunks: jobs.total_chunks_count,
        canCreateTimeline,
        shotList: jobs.shot_list
      } : null,
      steps: sortedSteps
    })

  } catch (error) {
    console.error('EDL status check error:', error)
    return NextResponse.json({ 
      error: 'Failed to get EDL generation status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}