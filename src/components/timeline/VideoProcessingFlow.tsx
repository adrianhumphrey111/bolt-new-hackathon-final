'use client'

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createClientSupabaseClient } from '../../lib/supabase/client'
import { trackVideoUpload, trackVideoProcessingComplete, trackError } from '../../lib/analytics/gtag'

interface UploadingVideo {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'uploaded' | 'failed'
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

interface VideoProcessingFlowProps {
  projectId: string
  onVideoCompleted: (video: CompletedVideo) => void
}

export interface VideoProcessingFlowMethods {
  addUploadingVideo: (video: UploadingVideo) => void
  updateUploadProgress: (id: string, progress: number) => void
  markUploadComplete: (id: string) => void
  markUploadFailed: (id: string) => void
}

export const VideoProcessingFlow = forwardRef<VideoProcessingFlowMethods, VideoProcessingFlowProps>(
  ({ projectId, onVideoCompleted }, ref) => {
  const [uploadingVideos, setUploadingVideos] = useState<UploadingVideo[]>([])
  const [processingVideos, setProcessingVideos] = useState<ProcessingVideo[]>([])
  const [completedVideos, setCompletedVideos] = useState<CompletedVideo[]>([])
  const [notifiedVideoIds, setNotifiedVideoIds] = useState<Set<string>>(new Set())
  const supabase = createClientSupabaseClient()

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
            processing_completed_at
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

      videos?.forEach(video => {
        const analysis = Array.isArray(video.video_analysis) 
          ? video.video_analysis[0] 
          : video.video_analysis

        // Debug logging to understand the issue
        if (video.original_name === 'IMG_1461.mp4') {
          console.log('🔍 Debug IMG_1461.mp4:', {
            videoId: video.id,
            analysisStatus: analysis?.status,
            hasAnalysis: !!analysis,
            isNotified: notifiedVideoIds.has(video.id),
            analysis: analysis
          })
        }

        if (analysis?.status === 'completed') {
          // Video is completed
          const completedVideo: CompletedVideo = {
            id: video.id,
            name: video.original_name,
            original_name: video.original_name,
            file_path: video.file_path,
            status: 'completed',
            created_at: video.created_at,
            analysis_completed_at: analysis.processing_completed_at,
            duration: video.duration ? Math.round(video.duration * 30) : 150 // Convert to frames
          }

          // Notify parent component only once
          if (!notifiedVideoIds.has(video.id)) {
            setNotifiedVideoIds(prev => new Set([...prev, video.id]))
            onVideoCompleted(completedVideo)
            
            // Track successful video processing completion
            const processingTime = analysis.processing_completed_at 
              ? new Date(analysis.processing_completed_at).getTime() - new Date(video.created_at).getTime()
              : undefined
            trackVideoProcessingComplete(video.id, processingTime || 0, true)
          }
          
          // Don't show completed videos in the processing flow once they're in main list
          // This keeps the UI clean - videos only appear here briefly during transition
        } else if (analysis?.status === 'failed') {
          // Video failed processing - only show if not already handled
          if (!notifiedVideoIds.has(video.id)) {
            processing.push({
              id: video.id,
              name: video.original_name,
              original_name: video.original_name,
              file_path: video.file_path,
              status: 'failed',
              created_at: video.created_at,
              error_message: analysis.error_message
            })
            
            // Track failed video processing
            trackVideoProcessingComplete(video.id, 0, false)
            trackError('video_processing_failed', analysis.error_message || 'Unknown error', video.id)
          }
        } else if (!analysis || (analysis.status !== 'completed' && analysis.status !== 'failed')) {
          // Video is still processing (not completed or failed)
          let status: ProcessingVideo['status'] = 'processing'
          if (analysis?.is_converting) {
            status = 'converting'
          } else if (analysis?.status === 'analyzing') {
            status = 'analyzing'
          } else if (analysis?.status === 'processing') {
            status = 'analyzing'
          }

          // Only show in processing if not already completed and added to main list
          if (!notifiedVideoIds.has(video.id)) {
            processing.push({
              id: video.id,
              name: video.original_name,
              original_name: video.original_name,
              file_path: video.file_path,
              status,
              created_at: video.created_at,
              is_converting: analysis?.is_converting,
              error_message: analysis?.error_message
            })
          }
        }
      })

      setProcessingVideos(processing)
      setCompletedVideos(completed)

    } catch (error) {
      console.error('Error polling processing status:', error)
    }
  }, [projectId, supabase, onVideoCompleted])

  // DISABLED: Polling is now handled by useVideoProcessing hook in MediaLibrary to avoid duplicate API calls
  // Only do initial fetch when component mounts or project changes, but no continuous polling
  useEffect(() => {
    if (!projectId) return

    console.log('🔄 VideoProcessingFlow: Initial fetch only (polling disabled to prevent duplicates)')
    pollProcessingStatus()
  }, [projectId, pollProcessingStatus])

  // Helper functions for parent component to use
  const addUploadingVideo = useCallback((video: UploadingVideo) => {
    setUploadingVideos(prev => [...prev, video])
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
        // Track successful video upload
        trackVideoUpload(video.size, video.name.split('.').pop() || 'unknown', true)
      }
      
      return prev.map(video => 
        video.id === id ? { ...video, status: 'uploaded' as const, progress: 100 } : video
      )
    })
    
    // Remove from uploading list after 2 seconds
    setTimeout(() => {
      setUploadingVideos(prev => prev.filter(video => video.id !== id))
    }, 2000)
  }, [])

  const markUploadFailed = useCallback((id: string) => {
    setUploadingVideos(prev => {
      const video = prev.find(v => v.id === id)
      if (video) {
        // Track failed video upload
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const getStatusIcon = (status: ProcessingVideo['status']) => {
    switch (status) {
      case 'converting':
        return (
          <svg className="w-4 h-4 animate-spin text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        )
      case 'analyzing':
        return (
          <svg className="w-4 h-4 animate-spin text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49z" clipRule="evenodd" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-pulse text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusText = (status: ProcessingVideo['status']) => {
    switch (status) {
      case 'converting':
        return 'Converting to MP4...'
      case 'analyzing':
        return 'Analyzing with AI...'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      default:
        return 'Processing...'
    }
  }

  return (
    <div className="space-y-6">
      {/* Uploading Videos */}
      {uploadingVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Uploading ({uploadingVideos.length})
          </h4>
          
          <div className="space-y-2">
            {uploadingVideos.map(video => (
              <div key={video.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-white truncate">{video.name}</div>
                    <div className="text-xs text-gray-400">{formatFileSize(video.size)}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {video.status === 'uploading' && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {video.status === 'uploaded' && (
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {video.status === 'failed' && (
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {video.status === 'uploading' && (
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                )}
                
                {video.status === 'uploaded' && (
                  <div className="text-xs text-green-400">Upload complete! Moving to analysis...</div>
                )}
                
                {video.status === 'failed' && (
                  <div className="text-xs text-red-400">Upload failed</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Videos */}
      {processingVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 animate-spin text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49z" clipRule="evenodd" />
            </svg>
            Being Analyzed ({processingVideos.length})
          </h4>
          
          <div className="space-y-2">
            {processingVideos.map(video => (
              <div key={video.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-white truncate">{video.name}</div>
                    <div className="text-xs text-gray-400">
                      Uploaded {new Date(video.created_at).toLocaleTimeString()}
                    </div>
                    {video.error_message && (
                      <div className="text-xs text-red-400 mt-1">{video.error_message}</div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(video.status)}
                    <span className="text-xs text-gray-400">{getStatusText(video.status)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Videos */}
      {completedVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Ready to Use ({completedVideos.length})
          </h4>
          
          <div className="space-y-2">
            {completedVideos.slice(0, 3).map(video => ( // Show only latest 3
              <div key={video.id} className="bg-gray-800 rounded-lg p-3 border border-green-600/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-white truncate">{video.name}</div>
                    <div className="text-xs text-green-400">
                      Analysis completed {new Date(video.analysis_completed_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-400">Ready</span>
                  </div>
                </div>
              </div>
            ))}
            
            {completedVideos.length > 3 && (
              <div className="text-xs text-gray-500 text-center py-2">
                ...and {completedVideos.length - 3} more completed videos
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show message when no activity */}
      {uploadingVideos.length === 0 && processingVideos.length === 0 && completedVideos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">No video activity</div>
          <div className="text-xs">Upload videos to see them process here</div>
        </div>
      )}
    </div>
  )
})

VideoProcessingFlow.displayName = 'VideoProcessingFlow'