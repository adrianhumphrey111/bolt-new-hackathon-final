import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getUserFromRequest } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  // Auth check - only authenticated users can test Bedrock
  const { user } = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  try {
    // Parse the request body
    const { prompt, model = 'anthropic.claude-3-5-sonnet-20241022-v2:0' } = await request.json();

    // Validate prompt
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check environment variables (using your NEXT_PUBLIC_ prefixed vars)
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

    console.log('Environment check:');
    console.log('AWS_ACCESS_KEY_ID exists:', !!accessKeyId);
    console.log('AWS_SECRET_ACCESS_KEY exists:', !!secretAccessKey);
    console.log('AWS_REGION:', region);

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { 
          error: 'Missing AWS credentials',
          details: {
            hasAccessKey: !!accessKeyId,
            hasSecretKey: !!secretAccessKey,
            region: region
          }
        },
        { status: 500 }
      );
    }

    // Initialize Bedrock client with multiple credential strategies
    let bedrockClient;
    
    try {
      // Try explicit credentials first
      bedrockClient = new BedrockRuntimeClient({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
      
      console.log('Bedrock client created with explicit credentials');
    } catch (credError) {
      console.log('Explicit credentials failed, trying default credential chain:', credError);
      
      // Fallback to default credential provider chain
      bedrockClient = new BedrockRuntimeClient({
        region: region,
      });
      
      console.log('Bedrock client created with default credential chain');
    }

    // Test credentials by attempting to resolve them
    try {
      console.log('Testing credential resolution...');
      // This will force credential resolution
      await bedrockClient.config.credentials();
      console.log('Credentials resolved successfully');
    } catch (credTestError) {
      console.error('Credential resolution failed:', credTestError);
      return NextResponse.json(
        { 
          error: 'AWS credentials could not be resolved',
          details: {
            message: credTestError.message,
            type: credTestError.name,
            suggestion: 'Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables'
          }
        },
        { status: 500 }
      );
    }

    // Prepare the request payload for Claude
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    console.log('Preparing Bedrock request with payload:', JSON.stringify(payload, null, 2));

    // Create the command
    const command = new InvokeModelCommand({
      modelId: model,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });

    console.log('Invoking Bedrock model:', model);
    
    // Invoke the model
    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return NextResponse.json({
      success: true,
      model: model,
      prompt: prompt,
      response: responseBody.content[0].text,
      usage: responseBody.usage || null,
      metadata: {
        timestamp: new Date().toISOString(),
        modelId: model,
      }
    });

  } catch (error: any) {
    console.error('Bedrock API Error:', error);

    // Return detailed error information
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error occurred',
        errorType: error.name || 'UnknownError',
        details: {
          message: error.message,
          code: error.code || error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Auth check - only authenticated users can access test endpoint info
  const { user } = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    message: 'AWS Bedrock Test Endpoint',
    usage: 'Send POST request with { "prompt": "your prompt here" }',
    availableModels: [
      'anthropic.claude-3-5-sonnet-20241022-v2:0', // Latest and most capable
      'anthropic.claude-3-5-sonnet-20240620-v1:0', // Previous 3.5 Sonnet
      'anthropic.claude-3-sonnet-20240229-v1:0',    // Claude 3 Sonnet
      'anthropic.claude-3-haiku-20240307-v1:0',     // Claude 3 Haiku (fast)
      'anthropic.claude-3-opus-20240229-v1:0',      // Claude 3 Opus (most capable)
      'anthropic.claude-instant-v1',
      'anthropic.claude-v2',
      'anthropic.claude-v2:1'
    ],
    requiredEnvVars: [
      'NEXT_PUBLIC_AWS_ACCESS_KEY_ID',
      'NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY',
      'NEXT_PUBLIC_AWS_REGION (optional, defaults to us-east-1)'
    ]
  });
}