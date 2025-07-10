import { createClientSupabaseClient } from './supabase/client';

export interface VideoStatus {
  id: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  processingStep?: string;
  error?: string;
  updatedAt: Date;
}

export interface PollingOptions {
  interval?: number;
  timeout?: number;
  onStatusChange?: (videoId: string, status: VideoStatus) => void;
  onError?: (error: Error) => void;
}

class VideoPollingService {
  private supabase = createClientSupabaseClient();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private subscribers: Map<string, Set<(status: VideoStatus) => void>> = new Map();
  private lastKnownStatus: Map<string, VideoStatus> = new Map();
  private isPolling = false;
  private globalInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Set up real-time subscription for video_analysis changes
    this.setupRealtimeSubscription();
  }

  private setupRealtimeSubscription() {
    this.supabase
      .channel('video_analysis_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_analysis',
        },
        (payload) => {
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
  }

  private handleRealtimeUpdate(payload: any) {
    const videoId = payload.new?.video_id || payload.old?.video_id;
    if (!videoId) return;

    const analysis = payload.new;
    if (analysis) {
      const status: VideoStatus = {
        id: videoId,
        status: this.mapAnalysisStatus(analysis.status),
        progress: analysis.overall_progress || 0,
        processingStep: analysis.processing_step,
        error: analysis.error_message,
        updatedAt: new Date(analysis.last_progress_update || analysis.processing_completed_at || new Date()),
      };

      this.updateStatus(videoId, status);
    }
  }

  private mapAnalysisStatus(analysisStatus: string): VideoStatus['status'] {
    switch (analysisStatus) {
      case 'processing':
      case 'queued':
      case 'pending':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private updateStatus(videoId: string, status: VideoStatus) {
    const previousStatus = this.lastKnownStatus.get(videoId);
    this.lastKnownStatus.set(videoId, status);

    // Only notify if status actually changed
    if (!previousStatus || 
        previousStatus.status !== status.status || 
        previousStatus.progress !== status.progress ||
        previousStatus.processingStep !== status.processingStep) {
      
      console.log(`Video ${videoId} status updated:`, status);
      
      // Notify all subscribers for this video
      const subscribers = this.subscribers.get(videoId);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(status);
          } catch (error) {
            console.error('Error in video status callback:', error);
          }
        });
      }
    }
  }

  public subscribe(videoId: string, callback: (status: VideoStatus) => void): () => void {
    if (!this.subscribers.has(videoId)) {
      this.subscribers.set(videoId, new Set());
    }
    
    this.subscribers.get(videoId)!.add(callback);
    
    // If we have a cached status, immediately call the callback
    const cachedStatus = this.lastKnownStatus.get(videoId);
    if (cachedStatus) {
      callback(cachedStatus);
    }
    
    // Start polling for this video if not already polling
    this.startPollingForVideo(videoId);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(videoId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(videoId);
          this.stopPollingForVideo(videoId);
        }
      }
    };
  }

  private async startPollingForVideo(videoId: string) {
    if (this.pollingIntervals.has(videoId)) {
      return; // Already polling for this video
    }

    const pollVideo = async () => {
      try {
        const { data, error } = await this.supabase
          .from('videos')
          .select(`
            id,
            video_analysis(
              status,
              processing_progress,
              overall_progress,
              processing_step,
              error_message,
              last_progress_update,
              processing_completed_at
            )
          `)
          .eq('id', videoId)
          .single();

        if (error) {
          console.error('Error polling video status:', error);
          return;
        }

        const analysis = data?.video_analysis?.[0];
        if (analysis) {
          const status: VideoStatus = {
            id: videoId,
            status: this.mapAnalysisStatus(analysis.status),
            progress: analysis.overall_progress || 0,
            processingStep: analysis.processing_step,
            error: analysis.error_message,
            updatedAt: new Date(analysis.last_progress_update || analysis.processing_completed_at || new Date()),
          };

          this.updateStatus(videoId, status);

          // Stop polling if video is completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            this.stopPollingForVideo(videoId);
          }
        }
      } catch (error) {
        console.error('Error in video polling:', error);
      }
    };

    // Initial poll
    await pollVideo();

    // Set up interval polling
    const interval = setInterval(pollVideo, 5000); // Poll every 5 seconds
    this.pollingIntervals.set(videoId, interval);
  }

  private stopPollingForVideo(videoId: string) {
    const interval = this.pollingIntervals.get(videoId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(videoId);
    }
  }

  public async getVideoStatus(videoId: string): Promise<VideoStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select(`
          id,
          video_analysis(
            status,
            processing_progress,
            overall_progress,
            processing_step,
            error_message,
            last_progress_update,
            processing_completed_at
          )
        `)
        .eq('id', videoId)
        .single();

      if (error || !data) {
        return null;
      }

      const analysis = data.video_analysis?.[0];
      if (!analysis) {
        return null;
      }

      const status: VideoStatus = {
        id: videoId,
        status: this.mapAnalysisStatus(analysis.status),
        progress: analysis.overall_progress || 0,
        processingStep: analysis.processing_step,
        error: analysis.error_message,
        updatedAt: new Date(analysis.last_progress_update || analysis.processing_completed_at || new Date()),
      };

      this.lastKnownStatus.set(videoId, status);
      return status;
    } catch (error) {
      console.error('Error getting video status:', error);
      return null;
    }
  }

  public async getMultipleVideoStatuses(videoIds: string[]): Promise<VideoStatus[]> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select(`
          id,
          video_analysis(
            status,
            processing_progress,
            overall_progress,
            processing_step,
            error_message,
            last_progress_update,
            processing_completed_at
          )
        `)
        .in('id', videoIds);

      if (error || !data) {
        return [];
      }

      const statuses: VideoStatus[] = [];
      
      for (const video of data) {
        const analysis = video.video_analysis?.[0];
        if (analysis) {
          const status: VideoStatus = {
            id: video.id,
            status: this.mapAnalysisStatus(analysis.status),
            progress: analysis.overall_progress || 0,
            processingStep: analysis.processing_step,
            error: analysis.error_message,
            updatedAt: new Date(analysis.last_progress_update || analysis.processing_completed_at || new Date()),
          };

          statuses.push(status);
          this.lastKnownStatus.set(video.id, status);
        }
      }

      return statuses;
    } catch (error) {
      console.error('Error getting multiple video statuses:', error);
      return [];
    }
  }

  public cleanup() {
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear subscribers
    this.subscribers.clear();
    
    // Clear cached status
    this.lastKnownStatus.clear();
    
    // Unsubscribe from real-time updates
    this.supabase.removeAllChannels();
  }
}

// Export singleton instance
export const videoPollingService = new VideoPollingService();

// Hook for React components
export function useVideoPolling() {
  return videoPollingService;
}