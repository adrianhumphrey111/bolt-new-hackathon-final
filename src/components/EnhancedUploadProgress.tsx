import React, { useState, useEffect, useCallback } from 'react';
import { uploadQueue, UploadSession, UploadTask } from '../lib/uploadQueue';
import { useWebSocket } from '../lib/websocket';

interface EnhancedUploadProgressProps {
  sessionId: string;
  onComplete?: (session: UploadSession) => void;
  onError?: (error: Error, task: UploadTask) => void;
}

export const EnhancedUploadProgress: React.FC<EnhancedUploadProgressProps> = ({
  sessionId,
  onComplete,
  onError,
}) => {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFailed, setShowFailed] = useState(true);
  const ws = useWebSocket();

  const updateSession = useCallback(() => {
    const currentSession = uploadQueue.getSession(sessionId);
    if (currentSession) {
      setSession(currentSession);
      
      // Don't auto-trigger completion - let user manually close modal
      // if (currentSession.status === 'completed' && onComplete) {
      //   onComplete(currentSession);
      // }
    }
  }, [sessionId]);

  useEffect(() => {
    // Initial load
    updateSession();
    
    // Subscribe to session updates with longer interval to reduce CPU usage
    const interval = setInterval(updateSession, 1000);
    
    return () => clearInterval(interval);
  }, [updateSession]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!ws || typeof ws.isConnected !== 'function' || !ws.isConnected()) return;

    if (typeof ws.subscribeToUploadSession === 'function') {
      const unsubscribe = ws.subscribeToUploadSession(sessionId, (data) => {
        console.log('WebSocket upload progress:', data);
        updateSession();
      });

      return unsubscribe;
    }
  }, [sessionId, ws, updateSession]);

  const toggleTaskExpansion = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const pauseSession = useCallback(() => {
    uploadQueue.pauseSession(sessionId);
  }, [sessionId]);

  const resumeSession = useCallback(() => {
    uploadQueue.resumeSession(sessionId);
  }, [sessionId]);

  const cancelSession = useCallback(() => {
    uploadQueue.cancelSession(sessionId);
  }, [sessionId]);

  const retryFailedTasks = useCallback(() => {
    // This would need to be implemented in the upload queue
    console.log('Retrying failed tasks...');
  }, []);

  const getStatusIcon = (status: UploadTask['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'converting':
        return '🔄';
      case 'uploading':
        return '📤';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: UploadTask['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'converting':
        return 'text-blue-500';
      case 'uploading':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (mbps: number) => {
    if (mbps < 1) return `${(mbps * 1000).toFixed(0)} KB/s`;
    return `${mbps.toFixed(1)} MB/s`;
  };

  const getFilteredTasks = () => {
    if (!session) return [];
    
    return session.tasks.filter(task => {
      if (task.status === 'completed' && !showCompleted) return false;
      if (task.status === 'failed' && !showFailed) return false;
      return true;
    });
  };

  const getOverallProgress = () => {
    if (!session) return 0;
    return Math.round((session.uploadedSize / session.totalSize) * 100);
  };

  const getEstimatedTimeRemaining = () => {
    if (!session || session.averageSpeed === 0) return 0;
    const remainingSize = session.totalSize - session.uploadedSize;
    return Math.round(remainingSize / (session.averageSpeed * 1024 * 1024));
  };

  if (!session) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-2 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const overallProgress = getOverallProgress();
  const estimatedTimeRemaining = getEstimatedTimeRemaining();
  const activeTasks = session.tasks.filter(t => t.status === 'uploading' || t.status === 'converting');

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          Upload Progress
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            session.status === 'active' ? 'bg-blue-500 text-white' :
            session.status === 'completed' ? 'bg-green-500 text-white' :
            session.status === 'paused' ? 'bg-yellow-500 text-black' :
            'bg-red-500 text-white'
          }`}>
            {session.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {session.completedFiles} of {session.totalFiles} files completed
          </span>
          <span>
            {formatFileSize(session.uploadedSize)} / {formatFileSize(session.totalSize)}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-lg font-semibold text-white">{session.completedFiles}</div>
          <div className="text-xs text-gray-400">Completed</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-lg font-semibold text-red-400">{session.failedFiles}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-lg font-semibold text-blue-400">
            {session.averageSpeed > 0 ? formatSpeed(session.averageSpeed) : '--'}
          </div>
          <div className="text-xs text-gray-400">Speed</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-lg font-semibold text-yellow-400">
            {estimatedTimeRemaining > 0 ? formatDuration(estimatedTimeRemaining) : '--'}
          </div>
          <div className="text-xs text-gray-400">Time Left</div>
        </div>
      </div>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Currently Processing</h4>
          {activeTasks.map(task => (
            <div key={task.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white truncate">
                  {task.file.name}
                </span>
                <span className={`text-xs ${getStatusColor(task.status)}`}>
                  {task.status.toUpperCase()}
                </span>
              </div>
              
              <div className="w-full bg-gray-600 rounded-full h-1 mb-2">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-400">
                <span>{task.progress}%</span>
                <span>{formatFileSize(task.metadata?.originalSize || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={session.status === 'active' ? pauseSession : resumeSession}
            disabled={session.status === 'completed' || session.status === 'cancelled'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {session.status === 'active' ? 'Pause' : 'Resume'}
          </button>
          
          <button
            onClick={cancelSession}
            disabled={session.status === 'completed' || session.status === 'cancelled'}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          
          {session.failedFiles > 0 && (
            <button
              onClick={retryFailedTasks}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Retry Failed
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            <span>Show Completed</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showFailed}
              onChange={(e) => setShowFailed(e.target.checked)}
              className="rounded"
            />
            <span>Show Failed</span>
          </label>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">
          Files ({filteredTasks.length})
        </h4>
        
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-gray-700 rounded-lg">
              <div 
                className="p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => toggleTaskExpansion(task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(task.status)}</span>
                    <span className="text-sm font-medium text-white truncate">
                      {task.file.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${getStatusColor(task.status)}`}>
                      {task.status === 'uploading' || task.status === 'converting' 
                        ? `${task.progress}%` 
                        : task.status.toUpperCase()
                      }
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(task.metadata?.originalSize || 0)}
                    </span>
                    <span className="text-gray-400">
                      {expandedTasks.has(task.id) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                
                {(task.status === 'uploading' || task.status === 'converting') && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-600 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {expandedTasks.has(task.id) && (
                <div className="px-3 pb-3 border-t border-gray-600">
                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    <div>Status: {task.status}</div>
                    <div>Priority: {task.priority}</div>
                    <div>Retry Count: {task.retryCount}</div>
                    {task.startedAt && (
                      <div>Started: {task.startedAt.toLocaleTimeString()}</div>
                    )}
                    {task.completedAt && (
                      <div>Completed: {task.completedAt.toLocaleTimeString()}</div>
                    )}
                    {task.error && (
                      <div className="text-red-400">Error: {task.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};