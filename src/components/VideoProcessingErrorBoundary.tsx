import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface VideoProcessingErrorBoundaryProps {
  children: React.ReactNode;
}

const VideoProcessingErrorBoundary: React.FC<VideoProcessingErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console for debugging
    console.error('Video processing error:', error, errorInfo);
    
    // You can send this to your error tracking service here
    // Example: Sentry, LogRocket, etc.
    
    // Track error in analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('video_processing_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const errorFallback = (
    <div className="video-processing-error">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h3>Video Processing Error</h3>
        <p>
          There was an error with the video processing system. 
          This might be due to a network issue or a temporary problem.
        </p>
        <div className="error-actions">
          <button
            onClick={() => window.location.reload()}
            className="error-button primary"
          >
            Reload Page
          </button>
          <button
            onClick={() => window.history.back()}
            className="error-button secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary onError={handleError} fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  );
};

export default VideoProcessingErrorBoundary;