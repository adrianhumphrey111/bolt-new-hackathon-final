import React, { useRef, useEffect, forwardRef } from 'react';
import { useVideoSource } from '../../lib/cdn';

interface CdnVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  onLoadError?: (error: Error) => void;
}

/**
 * Video component that automatically uses CDN URLs with S3 fallback
 */
export const CdnVideo = forwardRef<HTMLVideoElement, CdnVideoProps>(
  ({ src, onLoadError, onError, ...props }, ref) => {
    const { currentSrc, isUsingFallback, handleError } = useVideoSource(src);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Combine refs
    useEffect(() => {
      if (ref && videoRef.current) {
        if (typeof ref === 'function') {
          ref(videoRef.current);
        } else {
          ref.current = videoRef.current;
        }
      }
    }, [ref]);
    
    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const error = new Error(`Video failed to load: ${currentSrc}`);
      
      // Try fallback first
      handleError();
      
      // Call user's error handler
      if (onError) {
        onError(e);
      }
      
      // Call load error handler if fallback also failed
      if (isUsingFallback && onLoadError) {
        onLoadError(error);
      }
    };
    
    useEffect(() => {
      if (isUsingFallback) {
        console.log(`Using S3 fallback for video: ${currentSrc}`);
      } else if (currentSrc && src && currentSrc !== src) {
        console.log(`Using CDN URL for video: ${currentSrc}`);
      }
    }, [currentSrc, isUsingFallback, src]);
    
    return (
      <video
        ref={videoRef}
        src={currentSrc}
        onError={handleVideoError}
        {...props}
      />
    );
  }
);

CdnVideo.displayName = 'CdnVideo';

/**
 * Higher-order component to add CDN support to any video element
 */
export function withCdnSupport<P extends { src?: string }>(
  VideoComponent: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    const { currentSrc, isUsingFallback, handleError } = useVideoSource(props.src);
    
    return (
      <VideoComponent
        {...props}
        src={currentSrc}
        onError={(e: any) => {
          handleError();
          if (props.onError) {
            props.onError(e);
          }
        }}
      />
    );
  };
}