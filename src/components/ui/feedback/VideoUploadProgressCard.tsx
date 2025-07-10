import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Upload, Cpu, Sparkles, Clock, AlertCircle } from 'lucide-react';

export type VideoUploadStage = 'uploading' | 'uploaded' | 'processing' | 'analyzing' | 'ready' | 'failed';

export interface VideoUploadProgressCardProps {
  id: string;
  name: string;
  size: number;
  stage: VideoUploadStage;
  progress?: number;
  error?: string;
  timeElapsed?: number;
  estimatedTimeRemaining?: number;
  onRetry?: () => void;
}

const stageConfig = {
  uploading: {
    icon: Upload,
    label: 'Uploading',
    description: 'Transferring file to server...',
    color: 'blue',
    animated: true
  },
  uploaded: {
    icon: CheckCircle,
    label: 'Upload Complete',
    description: 'Preparing for analysis...',
    color: 'green',
    animated: false
  },
  processing: {
    icon: Cpu,
    label: 'Processing',
    description: 'Converting and optimizing...',
    color: 'purple',
    animated: true
  },
  analyzing: {
    icon: Sparkles,
    label: 'Analyzing',
    description: 'AI is analyzing your video...',
    color: 'amber',
    animated: true
  },
  ready: {
    icon: CheckCircle,
    label: 'Ready',
    description: 'Video is ready to use!',
    color: 'green',
    animated: false
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    description: 'Something went wrong',
    color: 'red',
    animated: false
  }
};

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    progress: 'bg-blue-500',
    text: 'text-blue-700'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
    progress: 'bg-green-500',
    text: 'text-green-700'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-500',
    progress: 'bg-purple-500',
    text: 'text-purple-700'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    progress: 'bg-amber-500',
    text: 'text-amber-700'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    progress: 'bg-red-500',
    text: 'text-red-700'
  }
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function VideoUploadProgressCard({
  name,
  size,
  stage,
  progress = 0,
  error,
  timeElapsed,
  estimatedTimeRemaining,
  onRetry
}: VideoUploadProgressCardProps) {
  const config = stageConfig[stage];
  const colors = colorClasses[config.color];
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-geist border p-geist-half transition-all duration-300',
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 mt-0.5',
          colors.icon,
          config.animated && 'animate-spin'
        )}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-foreground truncate">
              {name}
            </h4>
            <span className={cn('text-xs font-medium', colors.text)}>
              {config.label}
            </span>
          </div>

          {/* File info */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-subtitle">
              {formatFileSize(size)}
            </span>
            {timeElapsed && (
              <>
                <span className="text-xs text-subtitle">•</span>
                <span className="text-xs text-subtitle flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeElapsed)}
                </span>
              </>
            )}
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <>
                <span className="text-xs text-subtitle">•</span>
                <span className="text-xs text-subtitle">
                  ~{formatTime(estimatedTimeRemaining)} remaining
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-subtitle mb-3">
            {error || config.description}
          </p>

          {/* Progress bar */}
          {(stage === 'uploading' || (stage === 'processing' && progress > 0)) && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-subtitle">Progress</span>
                <span className={colors.text}>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-unfocused-border-color rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all duration-300 ease-out',
                    colors.progress
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Indeterminate progress for analyzing */}
          {(stage === 'analyzing' || (stage === 'processing' && progress === 0)) && (
            <div className="space-y-1">
              <div className="text-xs text-subtitle">Processing...</div>
              <div className="h-2 bg-unfocused-border-color rounded-full overflow-hidden">
                <div className={cn(
                  'h-full w-1/3 rounded-full animate-pulse',
                  colors.progress
                )} 
                style={{
                  animation: 'progress-indeterminate 2s ease-in-out infinite'
                }}
                />
              </div>
            </div>
          )}

          {/* Success state */}
          {stage === 'ready' && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">
                Ready to add to timeline
              </span>
            </div>
          )}

          {/* Failed state with retry */}
          {stage === 'failed' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">
                {error || 'Upload failed'}
              </span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(300%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}