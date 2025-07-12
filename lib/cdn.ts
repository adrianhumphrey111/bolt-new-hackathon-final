// CDN configuration for CloudFront distributions
export const CDN_CONFIG = {
  // Processed videos bucket CDN
  'raw-clips-global-processed.s3.us-east-1.amazonaws.com': 'd2u31oiz9593mr.cloudfront.net',
  'raw-clips-global-processed.s3.amazonaws.com': 'd2u31oiz9593mr.cloudfront.net',
  
  // Raw videos bucket CDN
  'raw-clips-global.s3.us-east-1.amazonaws.com': 'd21cj8p0cm8hsi.cloudfront.net',
  'raw-clips-global.s3.amazonaws.com': 'd21cj8p0cm8hsi.cloudfront.net',
} as const;

/**
 * Convert an S3 URL to a CloudFront CDN URL
 * @param s3Url - The original S3 URL
 * @returns The CDN URL if available, otherwise the original URL
 */
export function getCdnUrl(s3Url: string | undefined): string | undefined {
  if (!s3Url) return undefined;
  
  try {
    const url = new URL(s3Url);
    const hostname = url.hostname;
    
    // Check if we have a CDN mapping for this S3 bucket
    const cdnDomain = CDN_CONFIG[hostname as keyof typeof CDN_CONFIG];
    
    if (cdnDomain) {
      // Replace the S3 domain with the CDN domain
      url.hostname = cdnDomain;
      // CloudFront URLs use HTTPS
      url.protocol = 'https:';
      return url.toString();
    }
    
    // Return original URL if no CDN mapping found
    return s3Url;
  } catch (error) {
    console.error('Error converting to CDN URL:', error);
    return s3Url;
  }
}

/**
 * Create a video source with CDN URL and S3 fallback
 * @param s3Url - The original S3 URL
 * @returns Object with primary CDN URL and fallback S3 URL
 */
export function getVideoSourceWithFallback(s3Url: string | undefined): {
  primary: string | undefined;
  fallback: string | undefined;
} {
  const cdnUrl = getCdnUrl(s3Url);
  
  return {
    primary: cdnUrl,
    fallback: cdnUrl !== s3Url ? s3Url : undefined,
  };
}

/**
 * React hook for video source with automatic fallback
 */
export function useVideoSource(s3Url: string | undefined): {
  currentSrc: string | undefined;
  isUsingFallback: boolean;
  handleError: () => void;
} {
  const [isUsingFallback, setIsUsingFallback] = React.useState(false);
  const sources = React.useMemo(() => getVideoSourceWithFallback(s3Url), [s3Url]);
  
  const currentSrc = isUsingFallback ? sources.fallback : sources.primary;
  
  const handleError = React.useCallback(() => {
    if (!isUsingFallback && sources.fallback) {
      console.log('CDN failed, falling back to S3 URL:', sources.fallback);
      setIsUsingFallback(true);
    }
  }, [isUsingFallback, sources.fallback]);
  
  // Reset fallback state when URL changes
  React.useEffect(() => {
    setIsUsingFallback(false);
  }, [s3Url]);
  
  return {
    currentSrc,
    isUsingFallback,
    handleError,
  };
}

// Import React for the hook
import React from 'react';