import React, { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '../lib/supabase/client';
import { useWebSocket } from '../lib/websocket';
import { uploadQueue } from '../lib/uploadQueue';

interface SystemStats {
  totalVideos: number;
  analyzingVideos: number;
  completedVideos: number;
  failedVideos: number;
  stuckConverting: number;
  avgProcessingTime: string;
}

interface StorageStats {
  totalProjects: number;
  totalStorageGB: number;
  averageUploadSpeed: number;
  activeUploadSessions: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'complete' | 'failed';
  videoName: string;
  timestamp: Date;
  duration?: string;
  error?: string;
}

export const UploadMonitoringDashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  const supabase = createClientSupabaseClient();
  const ws = useWebSocket();

  useEffect(() => {
    fetchSystemStats();
    fetchStorageStats();
    fetchRecentActivity();
    setIsLoading(false);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSystemStats();
      fetchStorageStats();
      fetchRecentActivity();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // WebSocket listeners
  useEffect(() => {
    if (!ws || typeof ws.isConnected !== 'function' || !ws.isConnected()) return;

    const unsubscribeSystem = ws.subscribe('system_status', (data) => {
      setSystemStats(data);
    });

    const unsubscribeProgress = ws.subscribe('video_progress', (data) => {
      addRecentActivity({
        id: data.videoId,
        type: 'upload',
        videoName: data.videoName || 'Unknown',
        timestamp: new Date(),
      });
    });

    const unsubscribeComplete = ws.subscribe('video_complete', (data) => {
      addRecentActivity({
        id: data.videoId,
        type: 'complete',
        videoName: data.videoName || 'Unknown',
        timestamp: new Date(),
        duration: data.processingTime,
      });
    });

    const unsubscribeFailed = ws.subscribe('video_failed', (data) => {
      addRecentActivity({
        id: data.videoId,
        type: 'failed',
        videoName: data.videoName || 'Unknown',
        timestamp: new Date(),
        error: data.error,
      });
    });

    return () => {
      unsubscribeSystem();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeFailed();
    };
  }, [ws]);

  const fetchSystemStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_video_processing_stats');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const stats = data[0];
        setSystemStats({
          totalVideos: stats.total_videos || 0,
          analyzingVideos: stats.analyzing_videos || 0,
          completedVideos: stats.completed_videos || 0,
          failedVideos: stats.failed_videos || 0,
          stuckConverting: stats.stuck_converting || 0,
          avgProcessingTime: stats.avg_processing_time || 'N/A',
        });
      }
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError('Failed to fetch system statistics');
    }
  };

  const fetchStorageStats = async () => {
    try {
      const { data, error } = await supabase
        .from('video_storage_analysis')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const totalStorageGB = data.reduce((sum, project) => sum + (project.total_gb || 0), 0);
        const avgUploadSpeed = data.reduce((sum, project) => sum + (project.avg_upload_speed || 0), 0) / data.length;
        
        setStorageStats({
          totalProjects: data.length,
          totalStorageGB,
          averageUploadSpeed: avgUploadSpeed || 0,
          activeUploadSessions: uploadQueue.getAllSessions().filter(s => s.status === 'active').length,
        });
      }
    } catch (err) {
      console.error('Error fetching storage stats:', err);
      setError('Failed to fetch storage statistics');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          original_name,
          created_at,
          video_analysis(
            status,
            error_message,
            processing_completed_at,
            processing_started_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (data) {
        const activities: RecentActivity[] = data.map(video => {
          const analysis = video.video_analysis?.[0];
          const processingTime = analysis?.processing_completed_at && analysis?.processing_started_at
            ? new Date(analysis.processing_completed_at).getTime() - new Date(analysis.processing_started_at).getTime()
            : null;
          
          return {
            id: video.id,
            type: analysis?.status === 'completed' ? 'complete' : 
                  analysis?.status === 'failed' ? 'failed' : 'upload',
            videoName: video.original_name || 'Unknown',
            timestamp: new Date(video.created_at),
            duration: processingTime ? formatDuration(processingTime / 1000) : undefined,
            error: analysis?.error_message,
          };
        });
        
        setRecentActivity(activities);
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError('Failed to fetch recent activity');
    }
  };

  const addRecentActivity = (activity: RecentActivity) => {
    setRecentActivity(prev => [activity, ...prev].slice(0, 10));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (gb: number) => {
    if (gb < 1) return `${(gb * 1024).toFixed(1)} MB`;
    return `${gb.toFixed(2)} GB`;
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'upload': return '📤';
      case 'complete': return '✅';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'upload': return 'text-blue-400';
      case 'complete': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const runCleanup = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_orphaned_records');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        alert(`Cleanup completed: ${result.records_cleaned} records cleaned, ${result.errors_found} errors found`);
        fetchSystemStats(); // Refresh stats after cleanup
      }
    } catch (err) {
      console.error('Error running cleanup:', err);
      alert('Failed to run cleanup');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Upload Monitoring Dashboard</h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">
              Refresh every
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>
          
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
          
          <button
            onClick={runCleanup}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Run Cleanup
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="text-red-400">Error: {error}</div>
        </div>
      )}

      {/* System Statistics */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{systemStats?.totalVideos || 0}</div>
            <div className="text-sm text-gray-400">Total Videos</div>
          </div>
          
          <div className="bg-blue-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{systemStats?.analyzingVideos || 0}</div>
            <div className="text-sm text-gray-400">Processing</div>
          </div>
          
          <div className="bg-green-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{systemStats?.completedVideos || 0}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          
          <div className="bg-red-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{systemStats?.failedVideos || 0}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
          
          <div className="bg-yellow-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{systemStats?.stuckConverting || 0}</div>
            <div className="text-sm text-gray-400">Stuck Converting</div>
          </div>
          
          <div className="bg-purple-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {systemStats?.avgProcessingTime || 'N/A'}
            </div>
            <div className="text-sm text-gray-400">Avg Processing</div>
          </div>
        </div>
      </div>

      {/* Storage Statistics */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Storage & Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{storageStats?.totalProjects || 0}</div>
            <div className="text-sm text-gray-400">Total Projects</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {storageStats ? formatFileSize(storageStats.totalStorageGB) : '0 GB'}
            </div>
            <div className="text-sm text-gray-400">Total Storage</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {storageStats?.averageUploadSpeed.toFixed(1) || '0'} MB/s
            </div>
            <div className="text-sm text-gray-400">Avg Upload Speed</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{storageStats?.activeUploadSessions || 0}</div>
            <div className="text-sm text-gray-400">Active Sessions</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No recent activity</div>
          ) : (
            recentActivity.map((activity) => (
              <div key={`${activity.id}-${activity.timestamp.getTime()}`} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getActivityIcon(activity.type)}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{activity.videoName}</div>
                    <div className={`text-xs ${getActivityColor(activity.type)}`}>
                      {activity.type.toUpperCase()}
                      {activity.duration && ` • ${activity.duration}`}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  {activity.timestamp.toLocaleTimeString()}
                </div>
                
                {activity.error && (
                  <div className="text-xs text-red-400 max-w-xs truncate">
                    {activity.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* WebSocket Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${ws && typeof ws.isConnected === 'function' && ws.isConnected() ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-gray-400">
              WebSocket: {ws && typeof ws.isConnected === 'function' && ws.isConnected() ? 'Connected' : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-400">
              Database: Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};