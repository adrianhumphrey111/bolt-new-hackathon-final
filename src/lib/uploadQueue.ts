import { v4 as uuidv4 } from 'uuid';
import { retryAsync } from './retry';
import { uploadToS3 } from '../../lib/s3Upload';
import { convertMedia } from '@remotion/webcodecs';
import { createClientSupabaseClient } from './supabase/client';

export interface UploadTask {
  id: string;
  file: File;
  fileName: string;
  bucketName: string;
  projectId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'converting' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  metadata?: {
    duration?: number;
    originalSize: number;
    convertedSize?: number;
    analysisType?: string;
    videoId?: string;
    userId?: string;
  };
}

export interface UploadSession {
  id: string;
  projectId: string;
  tasks: UploadTask[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  startedAt: Date;
  completedAt?: Date;
  averageSpeed: number; // MB/s
}

export interface UploadQueueOptions {
  maxConcurrentUploads: number;
  maxConcurrentConversions: number;
  maxRetries: number;
  chunkSize: number;
  onTaskUpdate?: (task: UploadTask) => void;
  onSessionUpdate?: (session: UploadSession) => void;
  onError?: (error: Error, task: UploadTask) => void;
  onVideoSaved?: (videoId: string, task: UploadTask) => void;
  onAnalysisStarted?: (videoId: string, task: UploadTask) => void;
}

export class UploadQueue {
  private options: UploadQueueOptions;
  private activeUploads = new Map<string, UploadTask>();
  private activeConversions = new Map<string, UploadTask>();
  private pendingTasks: UploadTask[] = [];
  private sessions = new Map<string, UploadSession>();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(options: Partial<UploadQueueOptions> = {}) {
    this.options = {
      maxConcurrentUploads: 3,
      maxConcurrentConversions: 2,
      maxRetries: 3,
      chunkSize: 10 * 1024 * 1024, // 10MB chunks
      ...options,
    };

    this.startProcessing();
  }



  public async createSession(projectId: string, files: File[]): Promise<string> {
    const sessionId = uuidv4();
    
    // Get user session for file naming
    const supabase = createClientSupabaseClient();
    const { data: { session: userSession } } = await supabase.auth.getSession();
    if (!userSession) {
      throw new Error('No user session available for upload');
    }
    
    const userId = userSession.user.id;
    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET as string;
    
    // Create tasks with proper file naming and duration estimation
    const tasks: UploadTask[] = await Promise.all(files.map(async (file) => {
      const videoId = uuidv4();
      const timestamp = Date.now();
      const originalName = file.name;
      const fileName = `${userId}/${projectId}/videos/${videoId}_${timestamp}_${originalName}`;
      
      // Estimate duration for video files
      let duration = 90; // Default 3 seconds in frames (30fps)
      if (file.type.startsWith('video/')) {
        duration = await this.estimateDurationFromFile(file);
      }
      
      return {
        id: uuidv4(),
        file,
        fileName,
        bucketName,
        projectId,
        priority: 'medium',
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        retryCount: 0,
        metadata: {
          originalSize: file.size,
          duration,
          analysisType: 'full',
          userId,
        },
      };
    }));

    const session: UploadSession = {
      id: sessionId,
      projectId,
      tasks,
      status: 'active',
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      uploadedSize: 0,
      startedAt: new Date(),
      averageSpeed: 0,
    };

    this.sessions.set(sessionId, session);
    this.pendingTasks.push(...tasks);
    
    this.notifySessionUpdate(session);
    return sessionId;
  }

  private estimateDurationFromFile(file: File): Promise<number> {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const media = document.createElement('video');
        media.preload = 'metadata';
        
        // Set timeout to prevent hanging on problematic files
        const timeout = setTimeout(() => {
          console.log('Duration estimation timeout for:', file.name);
          resolve(90); // Default 3 seconds in frames
          URL.revokeObjectURL(media.src);
        }, 10000); // 10 second timeout
        
        media.onloadedmetadata = () => {
          clearTimeout(timeout);
          const durationInFrames = Math.round(media.duration * 30); // Assume 30fps
          resolve(durationInFrames);
          URL.revokeObjectURL(media.src);
        };
        
        media.onerror = (error) => {
          clearTimeout(timeout);
          console.log('Error estimating duration for:', file.name, error);
          resolve(90); // Default 3 seconds in frames
          URL.revokeObjectURL(media.src);
        };
        
        try {
          media.src = URL.createObjectURL(file);
        } catch (error) {
          clearTimeout(timeout);
          console.log('Error creating object URL for:', file.name, error);
          resolve(90); // Default 3 seconds in frames
        }
      } else {
        resolve(90); // Default 3 seconds in frames for non-video files
      }
    });
  }

  public pauseSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      // Cancel active tasks for this session
      this.activeUploads.forEach((task, taskId) => {
        if (task.projectId === session.projectId) {
          this.activeUploads.delete(taskId);
        }
      });
      this.notifySessionUpdate(session);
    }
  }

  public resumeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'active';
      this.notifySessionUpdate(session);
    }
  }

  public cancelSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'cancelled';
      session.completedAt = new Date();
      
      // Cancel all tasks for this session
      this.activeUploads.forEach((task, taskId) => {
        if (task.projectId === session.projectId) {
          this.activeUploads.delete(taskId);
        }
      });
      
      // Remove pending tasks
      this.pendingTasks = this.pendingTasks.filter(
        task => task.projectId !== session.projectId
      );
      
      this.notifySessionUpdate(session);
    }
  }

  public getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): UploadSession[] {
    return Array.from(this.sessions.values());
  }

  private startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 500);
  }

  private async processQueue() {
    // Process conversions first (if needed)
    await this.processConversions();
    
    // Then process uploads
    await this.processUploads();
    
    // Update session statistics
    this.updateSessionStats();
  }

  private async processConversions() {
    const availableSlots = this.options.maxConcurrentConversions - this.activeConversions.size;
    if (availableSlots <= 0) return;

    const conversionTasks = this.pendingTasks
      .filter(task => this.needsConversion(task.file) && task.status === 'pending')
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, availableSlots);

    for (const task of conversionTasks) {
      await this.startConversion(task);
    }
  }

  private async processUploads() {
    const availableSlots = this.options.maxConcurrentUploads - this.activeUploads.size;
    if (availableSlots <= 0) return;

    const uploadTasks = this.pendingTasks
      .filter(task => 
        (task.status === 'pending' && !this.needsConversion(task.file)) ||
        task.status === 'converting'
      )
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, availableSlots);

    for (const task of uploadTasks) {
      if (task.status === 'pending' || task.status === 'converting') {
        await this.startUpload(task);
      }
    }
  }

  private needsConversion(file: File): boolean {
    const isMov = file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov');
    const isUnderSizeLimit = file.size <= 500 * 1024 * 1024; // 500MB limit
    return isMov && isUnderSizeLimit;
  }

  private async startConversion(task: UploadTask) {
    task.status = 'converting';
    task.startedAt = new Date();
    this.activeConversions.set(task.id, task);
    
    this.notifyTaskUpdate(task);

    try {
      console.log(`🔄 Converting ${task.file.name} to MP4 using main thread`);
      
      const mp4Result = await convertMedia({
        src: task.file,
        container: 'mp4',
        onProgress: (progress) => {
          // Check if progress has a progress property, otherwise use the value directly
          const progressValue = typeof progress === 'object' && 'progress' in progress 
            ? (progress as any).progress 
            : progress;
          this.updateTaskProgress(task, progressValue * 100);
        },
      });
      
      const mp4Blob = await mp4Result.save();
      const convertedFile = new File([mp4Blob], task.file.name.replace(/\.mov$/i, '.mp4'), {
        type: 'video/mp4',
      });
      
      console.log(`✅ Conversion completed: ${task.file.name} -> ${convertedFile.name}`);
      this.completeConversion(task, convertedFile);
    } catch (error) {
      console.error(`❌ Conversion failed for ${task.file.name}:`, error);
      this.handleTaskError(task, error as Error);
    }
  }

  private async startUpload(task: UploadTask) {
    task.status = 'uploading';
    if (!task.startedAt) {
      task.startedAt = new Date();
    }
    this.activeUploads.set(task.id, task);
    
    this.notifyTaskUpdate(task);

    try {
      await retryAsync(
        async () => {
          await uploadToS3({
            file: task.file,
            fileName: task.fileName,
            bucketName: task.bucketName,
            onProgress: (progress) => {
              this.updateTaskProgress(task, progress);
            },
          });
        },
        {
          maxRetries: this.options.maxRetries,
          onRetry: (error, attempt) => {
            task.retryCount = attempt;
            task.error = error.message;
            this.notifyTaskUpdate(task);
          },
        }
      );

      await this.completeUpload(task);
    } catch (error) {
      this.handleTaskError(task, error as Error);
    }
  }

  private completeConversion(task: UploadTask, convertedFile: File) {
    task.file = convertedFile;
    task.status = 'pending'; // Ready for upload
    task.metadata!.convertedSize = convertedFile.size;
    
    this.activeConversions.delete(task.id);
    this.notifyTaskUpdate(task);
  }

  private async completeUpload(task: UploadTask) {
    try {
      // Save video to database if not already saved
      if (!task.metadata?.videoId) {
        console.log(`💾 Saving video to database: ${task.file.name}`);
        const videoId = await this.saveVideoToDatabase(task);
        if (videoId) {
          task.metadata!.videoId = videoId;
          // Start video analysis (async - don't wait)
          this.startVideoAnalysis(task);
        } else {
          console.warn(`⚠️ Failed to save video to database: ${task.file.name}`);
        }
      }
      
      task.status = 'completed';
      task.progress = 100;
      task.completedAt = new Date();
      
      this.activeUploads.delete(task.id);
      this.removePendingTask(task);
      
      console.log(`✅ Upload completed: ${task.file.name}`);
      this.notifyTaskUpdate(task);
    } catch (error) {
      console.error(`❌ Upload completion failed for ${task.file.name}:`, error);
      this.handleTaskError(task, error as Error);
    }
  }

  private async saveVideoToDatabase(task: UploadTask): Promise<string | null> {
    try {
      const supabase = createClientSupabaseClient();
      
      // Get current user session
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        throw new Error('No user session available');
      }

      const userId = userSession.user.id;
      const videoId = uuidv4();
      const timestamp = Date.now();
      const originalName = task.file.name;
      
      // Estimate duration (in seconds) - convert to frames later
      let duration = 90; // Default 3 seconds
      if (task.metadata?.duration) {
        duration = task.metadata.duration;
      }
      
      // Convert frames to seconds (assuming 30fps)
      const durationInSeconds = duration / 30;
      
      // Save video record to database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          id: videoId,
          project_id: task.projectId,
          file_name: task.fileName,
          original_name: originalName,
          file_path: task.fileName, // Store the S3 key directly
          duration: durationInSeconds,
          status: 'processing',
          file_size_bytes: task.file.size
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      console.log('✅ Video saved to project:', videoData);
      
      // Store metadata for later use
      task.metadata!.videoId = videoId;
      task.metadata!.userId = userId;
      
      if (this.options.onVideoSaved) {
        this.options.onVideoSaved(videoId, task);
      }
      
      return videoId;
    } catch (error) {
      console.error('❌ Error saving video to database:', error);
      return null;
    }
  }

  private async startVideoAnalysis(task: UploadTask): Promise<void> {
    if (!task.metadata?.videoId) return;
    
    try {
      const supabase = createClientSupabaseClient();
      
      // Get auth headers for API calls
      const { data: { session: userSession } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userSession?.access_token) {
        headers['Authorization'] = `Bearer ${userSession.access_token}`;
      }
      
      // Start video analysis asynchronously - don't wait for response
      // This prevents Lambda timeout issues (API Gateway 30s limit)
      console.log(`🚀 Starting async video analysis for ${task.metadata.videoId}`);
      
      fetch(`/api/videos/${task.metadata.videoId}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          analysisType: task.metadata.analysisType || 'full',
          fileSize: task.file.size
        })
      }).then(async (analysisResponse) => {
        if (analysisResponse.ok) {
          const result = await analysisResponse.json();
          console.log('✅ Video analysis started:', result);
          
          if (this.options.onAnalysisStarted) {
            this.options.onAnalysisStarted(task.metadata.videoId!, task);
          }
        } else {
          const errorText = await analysisResponse.text();
          console.warn(`⚠️ Analysis failed for ${task.metadata.videoId}: ${analysisResponse.status} ${errorText}`);
          // Don't fail the upload - analysis can be retried later
        }
      }).catch((error) => {
        console.warn(`⚠️ Analysis request failed for ${task.metadata.videoId}:`, error.message);
        // Don't fail the upload - analysis can be retried later
      });
      
      // Deduct 10 credits for video upload (do this synchronously)
      try {
        const response = await fetch('/api/user/usage/deduct', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'video_upload',
            credits: 10
          })
        });
        
        if (response.ok) {
          console.log('✅ Deducted 10 credits for video upload');
        } else {
          console.warn('Failed to deduct credits for video upload');
        }
      } catch (error) {
        console.warn('Error deducting credits:', error);
      }
      
    } catch (error) {
      console.error('❌ Error in video analysis setup:', error);
      // Don't throw here - we want the upload to succeed even if analysis setup fails
    }
  }

  private handleTaskError(task: UploadTask, error: Error) {
    task.status = 'failed';
    task.error = error.message;
    task.completedAt = new Date();
    
    this.activeUploads.delete(task.id);
    this.activeConversions.delete(task.id);
    this.removePendingTask(task);
    
    this.notifyTaskUpdate(task);
    
    if (this.options.onError) {
      this.options.onError(error, task);
    }
  }

  private updateTaskProgress(task: UploadTask, progress: number) {
    task.progress = Math.min(progress, 100);
    this.notifyTaskUpdate(task);
  }

  private updateSessionStats() {
    this.sessions.forEach(session => {
      const previousStatus = session.status;
      
      session.completedFiles = session.tasks.filter(t => t.status === 'completed').length;
      session.failedFiles = session.tasks.filter(t => t.status === 'failed').length;
      
      session.uploadedSize = session.tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.metadata!.originalSize, 0);
      
      // Calculate average speed
      const completedTasks = session.tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
      if (completedTasks.length > 0) {
        const totalTime = completedTasks.reduce((sum, t) => {
          return sum + (t.completedAt!.getTime() - t.startedAt!.getTime());
        }, 0) / 1000; // Convert to seconds
        
        const totalSize = completedTasks.reduce((sum, t) => sum + t.metadata!.originalSize, 0);
        session.averageSpeed = (totalSize / (1024 * 1024)) / totalTime; // MB/s
      }
      
      // Check if session is complete (only mark as completed once)
      if (session.completedFiles + session.failedFiles === session.totalFiles && session.status !== 'completed') {
        session.status = 'completed';
        session.completedAt = new Date();
        console.log(`✅ Session ${session.id} completed: ${session.completedFiles} uploaded, ${session.failedFiles} failed`);
      }
      
      // Only notify if something actually changed
      this.notifySessionUpdate(session);
    });
  }

  private findTaskById(taskId: string): UploadTask | undefined {
    for (const session of Array.from(this.sessions.values())) {
      const task = session.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  private removePendingTask(task: UploadTask) {
    this.pendingTasks = this.pendingTasks.filter(t => t.id !== task.id);
  }

  private getPriorityValue(priority: UploadTask['priority']): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  private notifyTaskUpdate(task: UploadTask) {
    if (this.options.onTaskUpdate) {
      this.options.onTaskUpdate(task);
    }
  }

  private notifySessionUpdate(session: UploadSession) {
    if (this.options.onSessionUpdate) {
      this.options.onSessionUpdate(session);
    }
  }

  public destroy() {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    
    // Clear all data
    this.activeUploads.clear();
    this.activeConversions.clear();
    this.pendingTasks = [];
    this.sessions.clear();
  }
}

// Singleton instance
export const uploadQueue = new UploadQueue();