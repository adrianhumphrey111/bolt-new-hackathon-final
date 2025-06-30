import { NextRequest, NextResponse } from 'next/server';
import { renderMediaOnLambda } from '@remotion/lambda/client';
import { v4 as uuidv4 } from 'uuid';

// Validate required environment variables
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME;
const SERVE_URL = process.env.REMOTION_SERVE_URL;
const REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';

if (!FUNCTION_NAME || !SERVE_URL) {
  console.error('Missing required environment variables: REMOTION_FUNCTION_NAME or REMOTION_SERVE_URL');
}

export async function POST(request: NextRequest) {
  try {
    const { 
      composition,
      timelineState,
      outputFormat = 'mp4',
      quality = 'medium',
      projectId,
      userId, // Optional: for tracking renders per user
    } = await request.json();

    // Validate environment variables at runtime
    if (!FUNCTION_NAME || !SERVE_URL) {
      throw new Error('Lambda function not configured. Please set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL environment variables.');
    }

    console.log('🎬 Starting render for project:', projectId);
    console.log('📍 Using Lambda function:', FUNCTION_NAME);
    console.log('🌐 Using serve URL:', SERVE_URL);

    // Generate unique render ID for tracking
    const renderJobId = uuidv4();

    // Start the render on Lambda
    const renderResponse = await renderMediaOnLambda({
      region: REGION as any,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      composition,
      inputProps: {
        timeline: timelineState,
        // Additional metadata for tracking
        metadata: {
          projectId,
          userId,
          renderJobId,
          timestamp: new Date().toISOString(),
        }
      },
      codec: outputFormat === 'mp4' ? 'h264' : 'h265',
      imageFormat: 'jpeg',
      maxRetries: 3,
      privacy: 'public',
      logLevel: 'info',
      // Quality settings
      crf: quality === 'high' ? 18 : quality === 'medium' ? 23 : 28,
      // Performance optimizations
      jpegQuality: quality === 'high' ? 95 : quality === 'medium' ? 90 : 80,
      // Concurrency controls to prevent AWS limits
      framesPerLambda: 30, // Increase chunk size to reduce total Lambda invocations
      // Webhook for progress updates (optional)
      webhook: process.env.WEBHOOK_SECRET ? {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/render/webhook`,
        secret: process.env.WEBHOOK_SECRET,
      } : undefined,
      // Output naming
      outName: `${projectId}-${renderJobId}.${outputFormat}`,
    });

    console.log('✅ Render started:', renderResponse.renderId);
    console.log('📦 Output bucket:', renderResponse.bucketName);

    // Optionally store render job in database for tracking
    // await db.renderJobs.create({ 
    //   id: renderJobId,
    //   lambdaRenderId: renderResponse.renderId,
    //   projectId,
    //   userId,
    //   status: 'rendering'
    // });

    return NextResponse.json({
      success: true,
      renderId: renderResponse.renderId,
      bucketName: renderResponse.bucketName,
      region: REGION,
      message: 'Render started successfully',
    });

  } catch (error) {
    console.error('❌ Render start failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Render start failed',
      },
      { status: 500 }
    );
  }
}