import React, { useState, useEffect } from 'react';
import { uploadQueue, UploadSession } from '../lib/uploadQueue';
import { useVideoProcessing } from '../hooks/useVideoProcessing';

interface UploadAndAnalysisProgressProps {
  sessionId: string;
  projectId: string;
}

interface ProcessingVideo {
  id: string;
  name: string;
  status: 'processing' | 'converting' | 'analyzing' | 'completed' | 'failed';
  progress?: number;
}

export const UploadAndAnalysisProgress: React.FC<UploadAndAnalysisProgressProps> = ({ 
  sessionId, 
  projectId
}) => {
  const [session, setSession] = useState<UploadSession | null>(null);
  const { processingVideos } = useVideoProcessing(projectId);
  
  // Track videos that have been uploaded from this session
  const [uploadedVideoIds, setUploadedVideoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateSession = () => {
      const currentSession = uploadQueue.getSession(sessionId);
      if (currentSession) {
        setSession(currentSession);
        
        // Track which videos from this session have been uploaded
        const completedTasks = currentSession.tasks.filter(t => t.status === 'completed');
        const videoIds = completedTasks
          .map(t => t.metadata?.videoId)
          .filter(Boolean);
        
        setUploadedVideoIds(new Set(videoIds));
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Get processing videos that are from this upload session
  const sessionProcessingVideos = processingVideos.filter(video => 
    uploadedVideoIds.has(video.id)
  );

  // Determine the current phase
  const getPhaseInfo = () => {
    if (!session) return { phase: 'loading', label: 'Loading...', color: 'gray' };
    
    const hasActiveUploads = session.tasks.some(t => 
      t.status === 'uploading' || t.status === 'converting'
    );
    
    const hasProcessingVideos = sessionProcessingVideos.length > 0;
    const allUploadsComplete = session.tasks.length > 0 && session.tasks.every(t => 
      t.status === 'completed' || t.status === 'failed'
    );
    
    if (hasActiveUploads) {
      return { 
        phase: 'uploading', 
        label: 'Upload in Progress', 
        color: 'blue',
        icon: '📤'
      };
    } else if (hasProcessingVideos) {
      return { 
        phase: 'analyzing', 
        label: 'Analyzing Videos', 
        color: 'purple',
        icon: '✨'
      };
    } else if (allUploadsComplete && session.completedFiles > 0) {
      // Upload is complete but analysis hasn't started yet or is finished
      if (uploadedVideoIds.size > 0) {
        return { 
          phase: 'analyzing', 
          label: 'Starting Analysis...', 
          color: 'purple',
          icon: '✨'
        };
      } else {
        return { 
          phase: 'completed', 
          label: 'All Complete', 
          color: 'green',
          icon: '✅'
        };
      }
    } else {
      return { 
        phase: 'uploading', 
        label: 'Upload in Progress', 
        color: 'blue',
        icon: '📤'
      };
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (mbps: number) => {
    if (mbps < 1) return `${(mbps * 1000).toFixed(0)} KB/s`;
    return `${mbps.toFixed(1)} MB/s`;
  };

  if (!session) {
    return (
      <div className="animate-pulse">
        <div className="h-2 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const phaseInfo = getPhaseInfo();
  const overallProgress = Math.round((session.uploadedSize / session.totalSize) * 100);
  const activeTasks = session.tasks.filter(t => t.status === 'uploading' || t.status === 'converting');
  const currentTask = activeTasks[0];

  const colorClasses = {
    blue: {
      dot: 'bg-blue-500',
      progress: 'bg-blue-600',
      text: 'text-blue-400'
    },
    purple: {
      dot: 'bg-purple-500',
      progress: 'bg-purple-600',
      text: 'text-purple-400'
    },
    green: {
      dot: 'bg-green-500',
      progress: 'bg-green-600',
      text: 'text-green-400'
    },
    gray: {
      dot: 'bg-gray-500',
      progress: 'bg-gray-600',
      text: 'text-gray-400'
    }
  };

  const colors = colorClasses[phaseInfo.color];

  return (
    <div className="space-y-3">
      {/* Phase Indicator */}
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${colors.dot} ${
          phaseInfo.phase === 'uploading' || phaseInfo.phase === 'analyzing' ? 'animate-pulse' : ''
        }`}></div>
        <span className="text-sm font-medium text-white">
          {phaseInfo.icon} {phaseInfo.label}
        </span>
      </div>

      {/* Upload Progress (when uploading) */}
      {phaseInfo.phase === 'uploading' && (
        <>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`${colors.progress} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Current Upload Task */}
          {currentTask && (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white truncate mr-2">
                  {currentTask.file.name}
                </span>
                <span className={`text-xs ${colors.text}`}>
                  {currentTask.status.toUpperCase()}
                </span>
              </div>
              
              <div className="w-full bg-gray-600 rounded-full h-1 mb-2">
                <div 
                  className={`${colors.progress} h-1 rounded-full transition-all duration-300`}
                  style={{ width: `${currentTask.progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-400">
                <span>{currentTask.progress}%</span>
                <span>{formatFileSize(currentTask.metadata?.originalSize || 0)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analysis Progress (when analyzing) */}
      {phaseInfo.phase === 'analyzing' && sessionProcessingVideos.length > 0 && (
        <div className="space-y-2">
          {sessionProcessingVideos.slice(0, 2).map(video => (
            <div key={video.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white truncate mr-2">
                  {video.name}
                </span>
                <span className={`text-xs ${colors.text}`}>
                  {video.status === 'converting' ? 'CONVERTING' : 
                   video.status === 'analyzing' ? 'ANALYZING' : 
                   video.status.toUpperCase()}
                </span>
              </div>
              
              {/* Indeterminate progress for analysis */}
              <div className="w-full bg-gray-600 rounded-full h-1 mb-2 overflow-hidden">
                <div 
                  className={`${colors.progress} h-1 rounded-full w-1/3 animate-pulse`}
                  style={{
                    animation: 'analysis-progress 2s ease-in-out infinite'
                  }}
                />
              </div>
              
              <div className="text-xs text-gray-400">
                {video.status === 'converting' ? 'Converting video format...' : 
                 video.status === 'analyzing' ? 'AI analyzing content...' : 
                 'Processing...'}
              </div>
            </div>
          ))}
          
          {sessionProcessingVideos.length > 2 && (
            <div className="text-xs text-gray-400 text-center">
              ...and {sessionProcessingVideos.length - 2} more videos being analyzed
            </div>
          )}
        </div>
      )}

      {/* Completion State */}
      {phaseInfo.phase === 'completed' && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">✅</span>
            <span className="text-sm text-green-400 font-medium">
              All videos uploaded and ready!
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {session.completedFiles} files processed successfully
          </div>
        </div>
      )}

      {/* Summary Stats - Compact */}
      <div className="grid grid-cols-4 gap-1 text-center">
        <div>
          <div className="text-sm font-semibold text-white">{session.completedFiles}</div>
          <div className="text-xs text-gray-400">Done</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-red-400">{session.failedFiles}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div>
          <div className={`text-sm font-semibold ${colors.text}`}>
            {phaseInfo.phase === 'analyzing' ? sessionProcessingVideos.length :
             session.averageSpeed > 0 ? formatSpeed(session.averageSpeed) : '--'}
          </div>
          <div className="text-xs text-gray-400">
            {phaseInfo.phase === 'analyzing' ? 'Analyzing' : 'Speed'}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-300">
            {phaseInfo.phase === 'analyzing' ? '--' : 
             session.totalFiles - session.completedFiles - session.failedFiles}
          </div>
          <div className="text-xs text-gray-400">
            {phaseInfo.phase === 'analyzing' ? 'Time Left' : 'Queue'}
          </div>
        </div>
      </div>

      {/* File Progress Summary */}
      <div className="text-xs text-gray-400 text-center">
        {phaseInfo.phase === 'analyzing' 
          ? `${sessionProcessingVideos.length} videos being analyzed by AI`
          : `${formatFileSize(session.uploadedSize)} / ${formatFileSize(session.totalSize)} uploaded`
        }
      </div>

      <style jsx>{`
        @keyframes analysis-progress {
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
};