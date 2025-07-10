import { retryAsync, isRetryableError, RetryableError } from './retry';
import { createClientSupabaseClient } from './supabase/client';
import { uploadToS3 } from './s3Upload';

export interface VideoProcessingOptions {
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: Error) => void;
}

export class VideoProcessingService {
  private supabase = createClientSupabaseClient();

  async uploadWithRetry(
    file: File,
    options: VideoProcessingOptions = {}
  ): Promise<{ url: string; key: string }> {
    const { maxRetries = 3, onProgress, onStatusChange, onError } = options;

    return retryAsync(
      async () => {
        if (onStatusChange) onStatusChange('uploading');
        
        const result = await uploadToS3(file, {
          onProgress: (progress) => {
            if (onProgress) onProgress(progress * 0.5); // Upload is 50% of total
          },
        });

        if (onStatusChange) onStatusChange('upload_complete');
        return result;
      },
      {
        maxRetries,
        shouldRetry: (error) => {
          // Retry for network errors and server errors
          if (isRetryableError(error)) {
            return true;
          }
          
          // Don't retry for file too large errors
          if (error.message.includes('file too large') || error.message.includes('413')) {
            return false;
          }
          
          return false;
        },
        onRetry: (error, attempt) => {
          console.warn(`Upload attempt ${attempt} failed:`, error.message);
          if (onError) onError(error);
        },
      }
    );
  }

  async saveVideoToDatabase(
    videoData: {
      id: string;
      projectId: string;
      fileName: string;
      originalName: string;
      filePath: string;
      duration: number;
      fileSize: number;
      uploadSessionId?: string;
    },
    options: VideoProcessingOptions = {}
  ): Promise<void> {
    const { maxRetries = 3, onStatusChange, onError } = options;

    return retryAsync(
      async () => {
        if (onStatusChange) onStatusChange('saving_to_database');

        const { error } = await this.supabase
          .from('videos')
          .insert({
            id: videoData.id,
            project_id: videoData.projectId,
            file_name: videoData.fileName,
            original_name: videoData.originalName,
            file_path: videoData.filePath,
            duration: videoData.duration,
            file_size_bytes: videoData.fileSize,
            upload_session_id: videoData.uploadSessionId,
            upload_started_at: new Date().toISOString(),
            upload_completed_at: new Date().toISOString(),
            status: 'uploaded',
          });

        if (error) {
          throw new RetryableError(`Database save failed: ${error.message}`);
        }

        if (onStatusChange) onStatusChange('database_save_complete');
      },
      {
        maxRetries,
        shouldRetry: (error) => {
          // Retry for database connection errors
          if (error.message.includes('connection') || error.message.includes('timeout')) {
            return true;
          }
          
          // Don't retry for duplicate key errors
          if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            return false;
          }
          
          return isRetryableError(error);
        },
        onRetry: (error, attempt) => {
          console.warn(`Database save attempt ${attempt} failed:`, error.message);
          if (onError) onError(error);
        },
      }
    );
  }

  async triggerAnalysis(
    videoId: string,
    options: VideoProcessingOptions = {}
  ): Promise<void> {
    const { maxRetries = 3, onStatusChange, onError } = options;

    return retryAsync(
      async () => {
        if (onStatusChange) onStatusChange('triggering_analysis');

        const { data: { session } } = await this.supabase.auth.getSession();
        
        const response = await fetch(`/api/videos/${videoId}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new RetryableError(`Analysis trigger failed: ${response.status} ${errorText}`);
        }

        if (onStatusChange) onStatusChange('analysis_triggered');
      },
      {
        maxRetries,
        shouldRetry: (error) => {
          // Retry for server errors and network errors
          if (isRetryableError(error)) {
            return true;
          }
          
          // Don't retry for 4xx errors (client errors)
          if (error.message.includes('400') || error.message.includes('401') || 
              error.message.includes('403') || error.message.includes('404')) {
            return false;
          }
          
          return false;
        },
        onRetry: (error, attempt) => {
          console.warn(`Analysis trigger attempt ${attempt} failed:`, error.message);
          if (onError) onError(error);
        },
      }
    );
  }

  async waitForAnalysisComplete(
    videoId: string,
    options: VideoProcessingOptions & { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 300000, onStatusChange, onProgress } = options; // 5 minutes default timeout
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const { data: video, error } = await this.supabase
          .from('videos')
          .select(`
            id,
            video_analysis(
              status,
              processing_progress,
              overall_progress,
              processing_step,
              error_message
            )
          `)
          .eq('id', videoId)
          .single();

        if (error) {
          throw new RetryableError(`Failed to check analysis status: ${error.message}`);
        }

        const analysis = video.video_analysis?.[0];
        
        if (analysis) {
          if (onStatusChange && analysis.processing_step) {
            onStatusChange(analysis.processing_step);
          }
          
          if (onProgress && analysis.overall_progress) {
            onProgress(50 + (analysis.overall_progress * 0.5)); // Analysis is 50% of total
          }

          if (analysis.status === 'completed') {
            if (onStatusChange) onStatusChange('analysis_complete');
            return;
          }
          
          if (analysis.status === 'failed') {
            throw new Error(`Analysis failed: ${analysis.error_message || 'Unknown error'}`);
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        // For polling errors, we'll retry the whole operation
        if (isRetryableError(error as Error)) {
          console.warn('Polling error, retrying:', error);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Analysis timeout - processing took too long');
  }

  async processVideo(
    file: File,
    videoData: {
      id: string;
      projectId: string;
      fileName: string;
      originalName: string;
      duration: number;
      uploadSessionId?: string;
    },
    options: VideoProcessingOptions = {}
  ): Promise<void> {
    const { onProgress, onStatusChange, onError } = options;

    try {
      // Step 1: Upload to S3 (0-50% progress)
      const uploadResult = await this.uploadWithRetry(file, {
        ...options,
        onProgress: (progress) => {
          if (onProgress) onProgress(progress * 0.5);
        },
      });

      // Step 2: Save to database (50-60% progress)
      await this.saveVideoToDatabase(
        {
          ...videoData,
          filePath: uploadResult.key,
          fileSize: file.size,
        },
        {
          ...options,
          onProgress: (progress) => {
            if (onProgress) onProgress(50 + (progress * 0.1));
          },
        }
      );

      // Step 3: Trigger analysis (60-70% progress)
      await this.triggerAnalysis(videoData.id, {
        ...options,
        onProgress: (progress) => {
          if (onProgress) onProgress(60 + (progress * 0.1));
        },
      });

      // Step 4: Wait for analysis completion (70-100% progress)
      await this.waitForAnalysisComplete(videoData.id, {
        ...options,
        onProgress: (progress) => {
          if (onProgress) onProgress(70 + (progress * 0.3));
        },
      });

      if (onProgress) onProgress(100);
      if (onStatusChange) onStatusChange('complete');
    } catch (error) {
      if (onError) onError(error as Error);
      throw error;
    }
  }
}

export const videoProcessingService = new VideoProcessingService();