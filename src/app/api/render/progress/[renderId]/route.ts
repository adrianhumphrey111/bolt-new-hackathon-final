import { NextRequest, NextResponse } from 'next/server';
import { getRenderProgress } from '@remotion/lambda/client';

// Use the same environment variables as render/start
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME;
const REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { renderId } = await params;
    
    // Get bucket name from query params (passed from frontend)
    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get('bucket');

    if (!FUNCTION_NAME) {
      throw new Error('Lambda function not configured');
    }

    if (!bucketName) {
      throw new Error('Bucket name not provided');
    }

    console.log('📊 Checking render progress for:', renderId);

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      region: REGION as any,
      functionName: FUNCTION_NAME,
    });

    // Format progress for frontend
    const progressData = {
      renderId,
      done: progress.done,
      progress: progress.overallProgress,
      timeElapsed: progress.timeToFinish,
      outputFile: progress.outputFile,
      outputSize: progress.outputSizeInBytes,
      costs: progress.costs,
      currentTime: progress.currentTime,
      errors: progress.errors,
    };

    console.log(`📈 Render progress: ${Math.round(progress.overallProgress * 100)}%`);

    return NextResponse.json({
      success: true,
      ...progressData,
    });

  } catch (error) {
    console.error('❌ Progress check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Progress check failed',
      },
      { status: 500 }
    );
  }
}