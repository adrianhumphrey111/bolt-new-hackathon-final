"use client";

import React, { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '../../lib/supabase/client';

interface QueuedVideo {
  id: string;
  video_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queue_position: number | null;
  queued_at: string;
  processing_started_at: string | null;
  error_message: string | null;
  videos: {
    original_name: string;
  };
}

interface QueueStats {
  queued_count: number;
  processing_count: number;
  completed_today: number;
  failed_today: number;
  avg_processing_time: string | null;
}

export function UploadQueueStatus({ projectId }: { projectId: string }) {
  const [queuedVideos, setQueuedVideos] = useState<QueuedVideo[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientSupabaseClient();

  // Fetch queue status
  const fetchQueueStatus = async () => {
    try {
      // Get queued and processing videos for this project
      const { data: videos, error } = await supabase
        .from('video_analysis')
        .select(`
          id,
          video_id,
          status,
          queue_position,
          queued_at,
          processing_started_at,
          error_message,
          videos!inner(original_name)
        `)
        .eq('project_id', projectId)
        .in('status', ['queued', 'processing'])
        .order('queue_position', { ascending: true });

      if (!error && videos) {
        setQueuedVideos(videos as QueuedVideo[]);
      }

      // Get queue statistics
      const { data: stats } = await supabase
        .rpc('get_queue_stats');

      if (stats && stats.length > 0) {
        setQueueStats(stats[0]);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchQueueStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`queue-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_analysis',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchQueueStatus();
        }
      )
      .subscribe();

    // Refresh every 10 seconds
    const interval = setInterval(fetchQueueStatus, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [projectId]);

  if (isLoading || queuedVideos.length === 0) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600/50 rounded">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-blue-300">Upload Queue</h3>
        {queueStats && (
          <div className="text-xs text-blue-400">
            {queueStats.queued_count} queued • {queueStats.processing_count} processing
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-32 overflow-y-auto">
        {queuedVideos.map((video) => (
          <div
            key={video.id}
            className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-xs"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {video.status === 'processing' ? (
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              )}
              <span className="truncate text-gray-300">
                {video.videos.original_name}
              </span>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              {video.status === 'queued' && video.queue_position && (
                <span className="text-gray-400">
                  #{video.queue_position}
                </span>
              )}
              {video.status === 'processing' && video.processing_started_at && (
                <span className="text-blue-400">
                  {formatTime(
                    Math.floor(
                      (Date.now() - new Date(video.processing_started_at).getTime()) / 1000
                    )
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {queueStats && queueStats.avg_processing_time && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
          Avg. processing time: {queueStats.avg_processing_time}
        </div>
      )}
    </div>
  );
}