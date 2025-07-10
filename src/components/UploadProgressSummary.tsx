import React, { useState, useEffect } from 'react';
import { uploadQueue, UploadSession } from '../lib/uploadQueue';

interface UploadProgressSummaryProps {
  sessionId: string;
}

export const UploadProgressSummary: React.FC<UploadProgressSummaryProps> = ({ sessionId }) => {
  const [session, setSession] = useState<UploadSession | null>(null);

  useEffect(() => {
    const updateSession = () => {
      const currentSession = uploadQueue.getSession(sessionId);
      if (currentSession) {
        setSession(currentSession);
      }
    };

    // Initial load
    updateSession();
    
    // Subscribe to session updates with longer interval to reduce CPU usage
    const interval = setInterval(updateSession, 1000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!session) {
    return (
      <div className="animate-pulse">
        <div className="h-2 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const overallProgress = Math.round((session.uploadedSize / session.totalSize) * 100);
  const activeTasks = session.tasks.filter(t => t.status === 'uploading' || t.status === 'converting');
  const currentTask = activeTasks[0];

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

  return (
    <div className="space-y-3">
      {/* Overall Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white truncate mr-2">
              {currentTask.file.name}
            </span>
            <span className="text-xs text-blue-400">
              {currentTask.status.toUpperCase()}
            </span>
          </div>
          
          <div className="w-full bg-gray-600 rounded-full h-1 mb-2">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${currentTask.progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>{currentTask.progress}%</span>
            <span>{formatFileSize(currentTask.metadata?.originalSize || 0)}</span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold text-white">{session.completedFiles}</div>
          <div className="text-xs text-gray-400">Done</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-400">{session.failedFiles}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-blue-400">
            {session.averageSpeed > 0 ? formatSpeed(session.averageSpeed) : '--'}
          </div>
          <div className="text-xs text-gray-400">Speed</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-300">
            {session.totalFiles - session.completedFiles - session.failedFiles}
          </div>
          <div className="text-xs text-gray-400">Queue</div>
        </div>
      </div>

      {/* File Progress Summary */}
      <div className="text-xs text-gray-400 text-center">
        {formatFileSize(session.uploadedSize)} / {formatFileSize(session.totalSize)} uploaded
      </div>
    </div>
  );
};