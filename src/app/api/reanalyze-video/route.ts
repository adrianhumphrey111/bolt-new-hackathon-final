import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, additionalContext = '' } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting reanalysis for video:', videoId);
    console.log('📝 Additional context:', additionalContext);

    // Get Supabase client with admin access (service role)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    

    // Get video and project information
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        file_path,
        project_id,
        original_name,
        projects (
          id,
          user_id,
          storyboard_content (
            text_content
          )
        )
      `)
      .eq('id', videoId)
      .single();

    if (videoError || !videoData) {
      console.error('❌ Video not found:', videoError);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found video:', videoData.original_name);
    console.log('📁 Project ID:', videoData.project_id);

    // Get existing storyboard content
    const storyboardContent = videoData.projects?.storyboard_content?.[0]?.text_content || '';
    
    // Clear existing analysis to prepare for reanalysis
    console.log('🗑️ Clearing existing analysis...');
    const { error: clearError } = await supabase
      .from('video_analysis')
      .delete()
      .eq('video_id', videoId);

    if (clearError) {
      console.warn('⚠️ Could not clear existing analysis:', clearError);
      // Continue anyway - analysis will be overwritten
    }

    // Create new analysis record with processing status
    const { error: createError } = await supabase
      .from('video_analysis')
      .insert({
        video_id: videoId,
        project_id: videoData.project_id,
        user_id: videoData.projects.user_id,
        status: 'processing',
        analysis_type: 'full',
        processing_step: 'initializing',
        processing_progress: 0,
        is_converting: false, // Skip conversion for reanalysis
        created_at: new Date().toISOString()
      });

    if (createError) {
      console.error('❌ Failed to create analysis record:', createError);
      return NextResponse.json(
        { error: 'Failed to initialize reanalysis' },
        { status: 500 }
      );
    }

    console.log('✅ Created new analysis record');

    // Prepare lambda payload for reanalysis
    const lambdaPayload = {
      httpMethod: 'POST',
      body: JSON.stringify({
        video_id: videoId,
        project_id: videoData.project_id,
        storyboard_content: storyboardContent,
        additional_context: additionalContext,
        trigger_source: 'reanalysis',
        has_storyboard: !!storyboardContent,
        is_reanalysis: true // Flag to indicate this is a reanalysis
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log('🚀 Invoking lambda for reanalysis...');

    // Check if AWS credentials are available
    if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || !process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials missing');
      console.error('AWS_ACCESS_KEY_ID:', process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ? 'present' : 'missing');
      console.error('AWS_SECRET_ACCESS_KEY:', process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ? 'present' : 'missing');
      
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Lambda client with credentials
    const lambdaClient = new LambdaClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
      }
    });

    // Invoke lambda function asynchronously for reanalysis
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'onVideoUpload',
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(lambdaPayload)
    });

    try {
      const lambdaResponse = await lambdaClient.send(command);
      console.log('✅ Lambda invoked successfully:', lambdaResponse.StatusCode);

      return NextResponse.json({
        message: 'Video reanalysis started successfully',
        videoId: videoId,
        status: 'processing',
        lambdaStatusCode: lambdaResponse.StatusCode
      });

    } catch (lambdaError) {
      console.error('❌ Lambda invocation failed:', lambdaError);
      
      // Update analysis status to failed
      await supabase
        .from('video_analysis')
        .update({
          status: 'failed',
          error_message: `Lambda invocation failed: ${lambdaError.message}`,
          processing_completed_at: new Date().toISOString()
        })
        .eq('video_id', videoId);

      return NextResponse.json(
        { error: 'Failed to start reanalysis' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Reanalysis endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}