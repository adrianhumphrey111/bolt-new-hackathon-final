import { NextRequest, NextResponse } from 'next/server';
import { getRenderProgress } from '@remotion/lambda/client';
import { getUserFromRequest } from '@/lib/supabase/server';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const LAMBDA_FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;

export async function GET(
  request: NextRequest,
  { params }: { params: { renderId: string } }
) {
  try {
    const { renderId } = params;
    const bucketName = request.nextUrl.searchParams.get('bucket');

    // Auth check
    const { user, supabase } = await getUserFromRequest(request);
    
    if (!user || !supabase) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    if (!LAMBDA_FUNCTION_NAME) {
      return NextResponse.json({
        success: false,
        error: 'Lambda function name not configured',
      });
    }

    const progress = await getRenderProgress({
      renderId,
      bucketName: bucketName || undefined,
      functionName: LAMBDA_FUNCTION_NAME,
      region: AWS_REGION as any,
    });

    // Update database with progress
    await supabase
      .from('renders')
      .update({
        progress: progress.overallProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('render_id', renderId)
      .eq('user_id', user.id);

    if (progress.done) {
      // Update database with completion
      await supabase
        .from('renders')
        .update({
          status: 'completed',
          output_url: progress.outputFile,
          progress: 1,
          completed_at: new Date().toISOString(),
        })
        .eq('render_id', renderId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        done: true,
        progress: 1,
        outputFile: progress.outputFile,
      });
    }

    if (progress.fatalErrorEncountered) {
      // Update database with error
      await supabase
        .from('renders')
        .update({
          status: 'failed',
          error_message: progress.errors?.[0]?.message || 'Unknown error',
        })
        .eq('render_id', renderId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: false,
        error: 'Render failed: ' + (progress.errors?.[0]?.message || 'Unknown error'),
      });
    }

    return NextResponse.json({
      success: true,
      done: false,
      progress: progress.overallProgress,
    });
  } catch (error) {
    console.error('Progress check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check progress',
    });
  }
}