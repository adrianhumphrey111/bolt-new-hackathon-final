'use client'

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createClientSupabaseClient } from '../../lib/supabase/client'
import { trackVideoUpload, trackVideoProcessingComplete, trackError } from '../../lib/analytics/gtag'
import VideoProcessingErrorBoundary from '../VideoProcessingErrorBoundary'
import { VideoUploadProgressCard, VideoUploadStage } from '../ui/feedback/VideoUploadProgressCard'
import { Stack } from '../ui/layout/Stack'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/base/Card'

interface UploadingVideo {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'uploaded' | 'failed'
  startTime?: number
}

interface ProcessingVideo {
  id: string
  name: string
  original_name: string
  file_path: string
  status: 'processing' | 'converting' | 'analyzing' | 'failed'
  created_at: string
  is_converting?: boolean
  error_message?: string
  stage: VideoUploadStage
  startTime?: number
}

interface CompletedVideo {
  id: string
  name: string
  original_name: string
  file_path: string
  status: 'completed'
  created_at: string
  analysis_completed_at: string
  src?: string
  duration?: number
}

interface FailedVideo {
  id: string
  name: string
  original_name: string
  file_path: string
  status: 'failed'
  created_at: string
  error_message?: string
  canRetry: boolean
}

interface EnhancedVideoProcessingFlowProps {
  projectId: string
  onVideoCompleted: (video: CompletedVideo) => void
}

export interface EnhancedVideoProcessingFlowMethods {
  addUploadingVideo: (video: UploadingVideo) => void
  updateUploadProgress: (id: string, progress: number) => void
  markUploadComplete: (id: string) => void
  markUploadFailed: (id: string) => void
}

export const EnhancedVideoProcessingFlow = forwardRef<EnhancedVideoProcessingFlowMethods, EnhancedVideoProcessingFlowProps>(
  ({ projectId, onVideoCompleted }, ref) => {
  const [uploadingVideos, setUploadingVideos] = useState<UploadingVideo[]>([])
  const [processingVideos, setProcessingVideos] = useState<ProcessingVideo[]>([])
  const [completedVideos, setCompletedVideos] = useState<CompletedVideo[]>([])
  const [failedVideos, setFailedVideos] = useState<FailedVideo[]>([])
  const [notifiedVideoIds, setNotifiedVideoIds] = useState<Set<string>>(new Set())
  const supabase = createClientSupabaseClient()

  // Function to determine video processing stage based on status
  const getVideoStage = (status: string, isConverting?: boolean): VideoUploadStage => {
    if (status === 'failed') return 'failed'
    if (status === 'completed') return 'ready'
    if (isConverting || status === 'converting') return 'processing'
    if (status === 'analyzing' || status === 'processing') return 'analyzing'
    return 'processing'
  }

  // Calculate time elapsed since upload started
  const getTimeElapsed = (startTime?: number): number => {
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  }

  // Estimate remaining time based on current progress
  const getEstimatedTimeRemaining = (progress: number, timeElapsed: number): number => {
    if (progress <= 0) return 0
    const totalEstimatedTime = (timeElapsed / progress) * 100
    return Math.max(0, totalEstimatedTime - timeElapsed)
  }

  // Poll for processing status updates
  const pollProcessingStatus = useCallback(async () => {
    if (!projectId) return

    try {
      // Get videos with their analysis status
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          id,
          original_name,
          file_path,
          created_at,
          duration,
          video_analysis!left(
            status,
            is_converting,
            error_message,
            processing_completed_at,
            created_at
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching video status:', error)
        return
      }

      const processing: ProcessingVideo[] = []
      const completed: CompletedVideo[] = []
      const failed: FailedVideo[] = []

      videos?.forEach(video => {
        // Check if any analysis is completed
        const hasCompletedAnalysis = Array.isArray(video.video_analysis) 
          ? video.video_analysis.some(a => a.status === 'completed')
          : video.video_analysis?.status === 'completed'
        
        // Get the most recent analysis record only if needed
        const analysis = hasCompletedAnalysis 
          ? (Array.isArray(video.video_analysis) 
              ? video.video_analysis.find(a => a.status === 'completed')
              : video.video_analysis)
          : (Array.isArray(video.video_analysis) ? video.video_analysis[0] : video.video_analysis)

        if (hasCompletedAnalysis) {
          const completedVideo: CompletedVideo = {
            id: video.id,
            name: video.original_name,
            original_name: video.original_name,
            file_path: video.file_path,
            status: 'completed',
            created_at: video.created_at,
            analysis_completed_at: analysis.processing_completed_at,
            duration: video.duration ? Math.round(video.duration * 30) : 150
          }

          // Notify parent component only once
          if (!notifiedVideoIds.has(video.id)) {
            setNotifiedVideoIds(prev => new Set([...prev, video.id]))
            onVideoCompleted(completedVideo)
            
            const processingTime = analysis.processing_completed_at 
              ? new Date(analysis.processing_completed_at).getTime() - new Date(video.created_at).getTime()
              : undefined
            trackVideoProcessingComplete(video.id, processingTime || 0, true)
          }
          
        } else if (analysis?.status === 'failed') {
          const failedVideo: FailedVideo = {
            id: video.id,
            name: video.original_name,
            original_name: video.original_name,
            file_path: video.file_path,
            status: 'failed',
            created_at: video.created_at,
            error_message: analysis.error_message,
            canRetry: true
          }
          
          failed.push(failedVideo)
          
          if (!notifiedVideoIds.has(video.id)) {
            setNotifiedVideoIds(prev => new Set([...prev, video.id]))
            trackVideoProcessingComplete(video.id, 0, false)
            trackError('video_processing_failed', analysis.error_message || 'Unknown error', video.id)
          }
        } else if (!analysis || (analysis.status !== 'completed' && analysis.status !== 'failed')) {
          // Video is still processing
          if (!notifiedVideoIds.has(video.id)) {
            const stage = getVideoStage(analysis?.status || 'processing', analysis?.is_converting)
            
            processing.push({
              id: video.id,
              name: video.original_name,
              original_name: video.original_name,
              file_path: video.file_path,
              status: analysis?.status || 'processing',
              created_at: video.created_at,
              is_converting: analysis?.is_converting,
              error_message: analysis?.error_message,
              stage,
              startTime: new Date(video.created_at).getTime()
            })
          }
        }
      })

      setProcessingVideos(processing)
      setCompletedVideos(completed)
      setFailedVideos(failed)

    } catch (error) {
      console.error('Error polling processing status:', error)
    }
  }, [projectId, supabase, onVideoCompleted, notifiedVideoIds])

  useEffect(() => {
    if (!projectId) return
    
    console.log('🔄 EnhancedVideoProcessingFlow: Initial fetch')
    pollProcessingStatus()
    
    // Set up interval for regular polling
    const interval = setInterval(pollProcessingStatus, 3000) // Poll every 3 seconds
    
    return () => {
      clearInterval(interval)
    }
  }, [projectId, pollProcessingStatus])

  // Helper functions for parent component to use
  const addUploadingVideo = useCallback((video: UploadingVideo) => {
    console.log('🎬 EnhancedVideoProcessingFlow: Adding uploading video:', video)
    setUploadingVideos(prev => [...prev, { ...video, startTime: Date.now() }])
  }, [])

  const updateUploadProgress = useCallback((id: string, progress: number) => {
    setUploadingVideos(prev => 
      prev.map(video => 
        video.id === id ? { ...video, progress } : video
      )
    )
  }, [])

  const markUploadComplete = useCallback((id: string) => {
    setUploadingVideos(prev => {
      const video = prev.find(v => v.id === id)
      if (video) {
        trackVideoUpload(video.size, video.name.split('.').pop() || 'unknown', true)
      }
      
      return prev.map(video => 
        video.id === id ? { ...video, status: 'uploaded' as const, progress: 100 } : video
      )
    })
    
    // Transition to processing after a brief delay
    setTimeout(() => {
      setUploadingVideos(prev => prev.filter(video => video.id !== id))
      // Force a refresh to pick up the processing status
      pollProcessingStatus()
    }, 2000)
  }, [pollProcessingStatus])

  const markUploadFailed = useCallback((id: string) => {
    setUploadingVideos(prev => {
      const video = prev.find(v => v.id === id)
      if (video) {
        trackVideoUpload(video.size, video.name.split('.').pop() || 'unknown', false)
        trackError('video_upload_failed', 'Upload failed', video.id)
      }
      
      return prev.map(video => 
        video.id === id ? { ...video, status: 'failed' as const } : video
      )
    })
  }, [])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addUploadingVideo,
    updateUploadProgress,
    markUploadComplete,
    markUploadFailed
  }), [addUploadingVideo, updateUploadProgress, markUploadComplete, markUploadFailed])

  // Retry analysis for failed video
  const retryVideoAnalysis = useCallback(async (videoId: string) => {
    try {
      console.log(`🔄 Retrying analysis for video: ${videoId}`)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No user session for retry')
        return
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      // Remove from failed videos and reset notification status
      setFailedVideos(prev => prev.filter(v => v.id !== videoId))
      setNotifiedVideoIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(videoId)
        return newSet
      })
      
      // Start analysis request
      const response = await fetch(`/api/videos/${videoId}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          analysisType: 'full',
          retry: true
        })
      })
      
      if (response.ok) {
        console.log(`✅ Analysis retry started for video: ${videoId}`)
        pollProcessingStatus()
      } else {
        const errorText = await response.text()
        console.error(`❌ Analysis retry failed for video: ${videoId}`, errorText)
      }
      
    } catch (error) {
      console.error('Error retrying video analysis:', error)
    }
  }, [supabase, pollProcessingStatus])

  const retryUpload = useCallback((id: string) => {
    // Remove from failed uploads and allow retry
    setUploadingVideos(prev => prev.filter(video => video.id !== id))
  }, [])

  return (
    <VideoProcessingErrorBoundary>
      <div className="space-y-6">
        {/* Active Uploads and Processing */}
        {(uploadingVideos.length > 0 || processingVideos.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Video Processing ({uploadingVideos.length + processingVideos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Stack spacing="sm">
                {/* Uploading Videos */}
                {uploadingVideos.map(video => {
                  const timeElapsed = getTimeElapsed(video.startTime)
                  const estimatedTimeRemaining = video.status === 'uploading' && video.progress > 5
                    ? getEstimatedTimeRemaining(video.progress, timeElapsed)
                    : undefined

                  return (
                    <VideoUploadProgressCard
                      key={video.id}
                      id={video.id}
                      name={video.name}
                      size={video.size}
                      stage={video.status === 'uploaded' ? 'uploaded' : video.status === 'failed' ? 'failed' : 'uploading'}
                      progress={video.progress}
                      timeElapsed={timeElapsed}
                      estimatedTimeRemaining={estimatedTimeRemaining}
                      onRetry={video.status === 'failed' ? () => retryUpload(video.id) : undefined}
                    />
                  )
                })}

                {/* Processing Videos */}
                {processingVideos.map(video => {
                  const timeElapsed = getTimeElapsed(video.startTime)
                  
                  return (
                    <VideoUploadProgressCard
                      key={video.id}
                      id={video.id}
                      name={video.name}
                      size={0} // Size not available for processing videos
                      stage={video.stage}
                      timeElapsed={timeElapsed}
                      error={video.error_message}
                    />
                  )
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Recently Completed Videos */}
        {completedVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Recently Completed ({Math.min(completedVideos.length, 3)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Stack spacing="sm">
                {completedVideos.slice(0, 3).map(video => (
                  <VideoUploadProgressCard
                    key={video.id}
                    id={video.id}
                    name={video.name}
                    size={0}
                    stage="ready"
                  />
                ))}
                
                {completedVideos.length > 3 && (
                  <div className="text-xs text-subtitle text-center py-2">
                    ...and {completedVideos.length - 3} more completed videos
                  </div>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Failed Videos */}
        {failedVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Failed Videos ({failedVideos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Stack spacing="sm">
                {failedVideos.map(video => (
                  <VideoUploadProgressCard
                    key={video.id}
                    id={video.id}
                    name={video.name}
                    size={0}
                    stage="failed"
                    error={video.error_message}
                    onRetry={video.canRetry ? () => retryVideoAnalysis(video.id) : undefined}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {uploadingVideos.length === 0 && processingVideos.length === 0 && 
         completedVideos.length === 0 && failedVideos.length === 0 && (
          <Card variant="ghost">
            <CardContent className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 opacity-50 text-subtitle">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No video activity</h3>
              <p className="text-xs text-subtitle">Upload videos to see them process here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </VideoProcessingErrorBoundary>
  )
})

EnhancedVideoProcessingFlow.displayName = 'EnhancedVideoProcessingFlow'