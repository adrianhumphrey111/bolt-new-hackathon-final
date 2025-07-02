import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '../../../lib/ai-service';

export async function GET() {
  try {
    const currentProvider = aiService.getCurrentProvider();
    
    // Check environment variables
    const openaiKeyExists = !!process.env.NEXT_OPENAI_API_KEY;
    const bedrockFlag = process.env.BEDROCK_INVOKE === 'true' || process.env.BEDROCK_INVOKE === 'TRUE';
    const awsKeyExists = !!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const awsSecretExists = !!process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

    const status = {
      currentProvider,
      environmentSetup: {
        BEDROCK_INVOKE: bedrockFlag,
        NEXT_OPENAI_API_KEY: openaiKeyExists ? 'SET' : 'MISSING',
        NEXT_PUBLIC_AWS_ACCESS_KEY_ID: awsKeyExists ? 'SET' : 'MISSING',
        NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY: awsSecretExists ? 'SET' : 'MISSING',
        NEXT_PUBLIC_AWS_REGION: awsRegion
      },
      recommendations: []
    };

    // Add recommendations based on current setup
    if (bedrockFlag && (!awsKeyExists || !awsSecretExists)) {
      status.recommendations.push('Bedrock is enabled but AWS credentials are missing');
    }
    
    if (!bedrockFlag && !openaiKeyExists) {
      status.recommendations.push('OpenAI is enabled but API key is missing');
    }

    if (bedrockFlag && awsKeyExists && awsSecretExists) {
      status.recommendations.push('✅ Bedrock setup looks good');
    }

    if (!bedrockFlag && openaiKeyExists) {
      status.recommendations.push('✅ OpenAI setup looks good');
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('AI status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check AI status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt = 'Hello! Please respond with a simple greeting.' } = await request.json();
    
    const currentProvider = aiService.getCurrentProvider();
    console.log(`Testing ${currentProvider} with prompt:`, prompt);

    const response = await aiService.complete(
      prompt,
      'You are a helpful AI assistant. Respond concisely.',
      { temperature: 0.1, max_tokens: 100 }
    );

    return NextResponse.json({
      success: true,
      provider: currentProvider,
      prompt,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json(
      {
        success: false,
        provider: aiService.getCurrentProvider(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}