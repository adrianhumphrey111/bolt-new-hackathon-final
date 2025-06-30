/**
 * Usage tracking utilities for renders and exports
 */

export interface RenderTrackingData {
  projectId: string;
  videoIds: string[];
  durationMs: number;
  fps?: number;
  resolution?: string;
  format?: string;
}

export interface ExportTrackingData {
  projectId: string;
  renderId?: string;
  exportType?: 'download' | 's3' | 'youtube' | 'other';
  fileSizeBytes?: number;
  filePath?: string;
  metadata?: Record<string, any>;
}

/**
 * Start tracking a render
 */
export async function startRenderTracking(data: RenderTrackingData): Promise<string | null> {
  try {
    const response = await fetch('/api/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to start render tracking: ${response.statusText}`);
    }

    const result = await response.json();
    return result.renderId;
  } catch (error) {
    console.error('Error starting render tracking:', error);
    return null;
  }
}

/**
 * Update render status
 */
export async function updateRenderStatus(
  renderId: string, 
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/renders/${renderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        errorMessage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update render status: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating render status:', error);
    return false;
  }
}

/**
 * Track an export
 */
export async function trackExport(data: ExportTrackingData): Promise<string | null> {
  try {
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to track export: ${response.statusText}`);
    }

    const result = await response.json();
    return result.exportId;
  } catch (error) {
    console.error('Error tracking export:', error);
    return null;
  }
}

/**
 * Calculate duration in milliseconds from timeline items
 */
export function calculateTimelineDuration(timelineItems: any[], fps: number = 30): number {
  if (!timelineItems || timelineItems.length === 0) return 0;

  // Find the maximum end time across all items
  const maxEndTime = Math.max(...timelineItems.map(item => 
    (item.startTime || 0) + (item.duration || 0)
  ));

  // Convert frames to milliseconds
  return Math.round((maxEndTime / fps) * 1000);
}

/**
 * Extract video IDs from timeline items
 */
export function extractVideoIds(timelineItems: any[]): string[] {
  if (!timelineItems || timelineItems.length === 0) return [];

  const videoIds = new Set<string>();
  
  timelineItems.forEach(item => {
    if (item.type === 'video' && item.properties?.video_id) {
      videoIds.add(item.properties.video_id);
    }
  });

  return Array.from(videoIds);
}

/**
 * Get file size from a File object or fetch from URL
 */
export async function getFileSize(source: File | string): Promise<number> {
  if (source instanceof File) {
    return source.size;
  }

  // If it's a URL, try to fetch the content-length header
  try {
    const response = await fetch(source, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch (error) {
    console.warn('Could not determine file size from URL:', source, error);
    return 0;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Helper to track a complete render workflow
 */
export async function trackRenderWorkflow(
  projectId: string,
  timelineItems: any[],
  fps: number = 30,
  resolution: string = '1920x1080',
  format: string = 'mp4'
): Promise<{
  renderId: string | null;
  updateStatus: (status: 'completed' | 'failed', errorMessage?: string) => Promise<boolean>;
}> {
  const videoIds = extractVideoIds(timelineItems);
  const durationMs = calculateTimelineDuration(timelineItems, fps);
  
  const renderId = await startRenderTracking({
    projectId,
    videoIds,
    durationMs,
    fps,
    resolution,
    format
  });

  return {
    renderId,
    updateStatus: async (status: 'completed' | 'failed', errorMessage?: string) => {
      if (!renderId) return false;
      return updateRenderStatus(renderId, status, errorMessage);
    }
  };
}