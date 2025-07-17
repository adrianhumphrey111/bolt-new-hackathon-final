import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = params;
    const { user_prompt, platform } = await request.json();

    // Validate inputs
    if (!user_prompt || !platform) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_prompt, platform' 
      }, { status: 400 });
    }

    const { data: newJob, error: jobError } = await supabase
      .from('edl_generation_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        user_prompt: user_prompt,
        platform: platform
      })
      .select('id')
      .single()

    // Validate project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project || !newJob) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Call the lambda function
    const lambdaResponse = await fetch('https://iw6lhqg9ji.execute-api.us-east-1.amazonaws.com/default/createEditDecisionList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        user_id: user.id,
        user_prompt: user_prompt,
        platform: platform,
        job_id: newJob.id,
      }),
    });

    // We do not care about the lambda response
    // if (!lambdaResponse.ok) {
    //   const errorText = await lambdaResponse.text();
    //   console.error('Lambda function error:', errorText);
    //   return NextResponse.json({ 
    //     error: 'Failed to start generation' 
    //   }, { status: 500 });
    // }

    // const lambdaResult = await lambdaResponse.json();
    
    // // Parse the response (handle both wrapped and direct formats)
    // const responseData = lambdaResult.body 
    //   ? JSON.parse(lambdaResult.body) 
    //   : lambdaResult;

    // if (!responseData.success || !responseData.data?.job_id) {
    //   console.error('Invalid lambda response:', responseData);
    //   return NextResponse.json({ 
    //     error: 'Invalid response from generation service' 
    //   }, { status: 500 });
    // }

    // Return the job ID and status
    return NextResponse.json({
      success: true,
      job_id: newJob.id,
      status: 'processing',
      message: 'Generation started',
      architecture: 'v2_autonomous'
    });

  } catch (error) {
    console.error('Generate timeline error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}