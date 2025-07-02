import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { getUserFromRequest } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  // Auth check - only authenticated users can test credentials
  const { user } = await getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  try {
    // Check environment variables (using your NEXT_PUBLIC_ prefixed vars)
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

    console.log('=== AWS Credentials Debug ===');
    console.log('AWS_ACCESS_KEY_ID exists:', !!accessKeyId);
    console.log('AWS_ACCESS_KEY_ID length:', accessKeyId?.length || 0);
    console.log('AWS_ACCESS_KEY_ID starts with:', accessKeyId?.substring(0, 4) || 'undefined');
    console.log('AWS_SECRET_ACCESS_KEY exists:', !!secretAccessKey);
    console.log('AWS_SECRET_ACCESS_KEY length:', secretAccessKey?.length || 0);
    console.log('AWS_REGION:', region);

    const result = {
      environmentVariables: {
        AWS_ACCESS_KEY_ID: {
          exists: !!accessKeyId,
          length: accessKeyId?.length || 0,
          preview: accessKeyId?.substring(0, 4) || 'undefined'
        },
        AWS_SECRET_ACCESS_KEY: {
          exists: !!secretAccessKey,
          length: secretAccessKey?.length || 0,
          preview: secretAccessKey ? '***HIDDEN***' : 'undefined'
        },
        AWS_REGION: region
      }
    };

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({
        ...result,
        status: 'MISSING_CREDENTIALS',
        message: 'AWS credentials are missing from environment variables'
      });
    }

    // Test credential formats
    const accessKeyValid = /^AKIA[0-9A-Z]{16}$/.test(accessKeyId);
    const secretKeyValid = secretAccessKey.length === 40;

    result.validation = {
      accessKeyFormat: accessKeyValid ? 'VALID' : 'INVALID (should be AKIA + 16 chars)',
      secretKeyFormat: secretKeyValid ? 'VALID' : 'INVALID (should be 40 chars)'
    };

    if (!accessKeyValid || !secretKeyValid) {
      return NextResponse.json({
        ...result,
        status: 'INVALID_FORMAT',
        message: 'AWS credential format appears to be invalid'
      });
    }

    // Try to create Bedrock client
    try {
      const bedrockClient = new BedrockRuntimeClient({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });

      // Test credential resolution
      const credentials = await bedrockClient.config.credentials();
      
      return NextResponse.json({
        ...result,
        status: 'SUCCESS',
        message: 'AWS credentials are valid and Bedrock client created successfully',
        credentialTest: {
          resolved: true,
          accessKeyId: credentials.accessKeyId?.substring(0, 4) + '***'
        }
      });

    } catch (clientError: any) {
      return NextResponse.json({
        ...result,
        status: 'CLIENT_ERROR',
        message: 'Error creating Bedrock client or resolving credentials',
        error: {
          message: clientError.message,
          name: clientError.name,
          code: clientError.code
        }
      });
    }

  } catch (error: any) {
    console.error('Credential test error:', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        error: error.message,
        details: error.stack
      },
      { status: 500 }
    );
  }
}