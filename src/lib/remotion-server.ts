// Server-only imports for Remotion Lambda
// This file should only be imported in API routes (server-side)

import 'server-only';

export async function deployRemotionSite(params: {
  entryPoint: string;
  bucketName: string;
  region: string;
  siteName: string;
  inputProps?: any;
}) {
  const { deploySite } = await import('@remotion/lambda');
  
  return deploySite({
    entryPoint: params.entryPoint,
    bucketName: params.bucketName,
    region: params.region as any,
    siteName: params.siteName,
    options: {
      inputProps: params.inputProps,
    },
  });
}

export async function deployRemotionFunction(params: {
  memorySizeInMb: number;
  timeoutInSeconds: number;
  functionName: string;
  region: string;
  runtime: string;
}) {
  const { deployFunction } = await import('@remotion/lambda');
  
  return deployFunction({
    createCloudWatchLogGroup: true,
    memorySizeInMb: params.memorySizeInMb,
    timeoutInSeconds: params.timeoutInSeconds,
    functionName: params.functionName,
    region: params.region as any,
    runtime: params.runtime as any,
  });
}

export async function getOrCreateRemotionBucket(params: {
  region: string;
}) {
  const { getOrCreateBucket } = await import('@remotion/lambda');
  
  return getOrCreateBucket({
    region: params.region as any,
  });
}