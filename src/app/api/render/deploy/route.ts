import { NextRequest, NextResponse } from 'next/server';
import { 
  deployRemotionSite, 
  deployRemotionFunction, 
  getOrCreateRemotionBucket 
} from '../../../../lib/remotion-server';

export async function POST(request: NextRequest) {
  try {
    const { projectId, timelineState, composition } = await request.json();

    console.log('🚀 Starting deployment for project:', projectId);

    // 1. Ensure S3 bucket exists
    const bucketInfo = await getOrCreateRemotionBucket({
      region: 'us-east-1',
    });
    console.log('✅ S3 bucket ready:', bucketInfo.bucketName);

    // 2. Deploy the site (bundle timeline composition)
    const siteDeployment = await deployRemotionSite({
      entryPoint: './src/remotion/index.ts', // Entry point for your Remotion composition
      bucketName: bucketInfo.bucketName,
      region: 'us-east-1',
      siteName: `timeline-${projectId}-${Date.now()}`,
      inputProps: {
        timeline: timelineState,
        composition,
      },
    });
    console.log('✅ Site deployed:', siteDeployment.serveUrl);

    // 3. Deploy Lambda function (if not exists)
    const functionName = `remotion-render-${process.env.NODE_ENV || 'development'}`;
    
    let lambdaFunction;
    try {
      lambdaFunction = await deployRemotionFunction({
        memorySizeInMb: 2048,
        timeoutInSeconds: 120,
        functionName,
        region: 'us-east-1',
        runtime: 'nodejs18.x',
      });
      console.log('✅ Lambda function ready:', lambdaFunction.functionName);
    } catch (error) {
      console.log('ℹ️ Lambda function already exists, using existing one');
      lambdaFunction = { functionName };
    }

    return NextResponse.json({
      success: true,
      deployment: {
        siteId: siteDeployment.siteName,
        serveUrl: siteDeployment.serveUrl,
        functionName: lambdaFunction.functionName,
        bucketName: bucketInfo.bucketName,
      },
      message: 'Deployment successful, ready to render',
    });

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deployment failed',
      },
      { status: 500 }
    );
  }
}