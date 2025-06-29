'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Video {
  id: string
  file_name: string
  original_name: string
  file_path: string
  status: string
  created_at: string
  project_id: string
}

interface VideoAnalysis {
  id: string
  video_id: string
  status: string
  error_message?: string
  created_at: string
  updated_at: string
}

interface ProcessingVideoInfo {
  video: Video
  analysis?: VideoAnalysis
  startTime: Date
  elapsedSeconds: number
}

export function useVideoProcessing(projectId: string | null) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingVideos, setProcessingVideos] = useState<ProcessingVideoInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  
  const supabase = createClientComponentClient()
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  // Check for videos without analysis records or with processing status
  const checkProcessingStatus = useCallback(async () => {
    if (!projectId) {
      setIsProcessing(false)
      setProcessingVideos([])
      return
    }

    try {
      console.log('🔍 Checking video processing status for project:', projectId)
      
      // Get all videos for the project
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (videosError) throw videosError

      if (!videos || videos.length === 0) {
        setIsProcessing(false)
        setProcessingVideos([])
        setLastCheckTime(new Date())
        return
      }

      // Get all video analysis records for these videos
      const { data: analyses, error: analysesError } = await supabase
        .from('video_analysis')
        .select('*')
        .in('video_id', videos.map(v => v.id))

      if (analysesError) throw analysesError

      // Find videos that are still processing
      const currentlyProcessing: ProcessingVideoInfo[] = []
      
      videos.forEach(video => {
        const analysis = analyses?.find(a => a.video_id === video.id)
        
        // Video is processing if:
        // 1. No analysis record exists, OR
        // 2. Analysis record exists but status is 'processing' or 'pending'
        const isVideoProcessing = !analysis || 
          analysis.status === 'processing' || 
          analysis.status === 'pending' ||
          analysis.status === 'queued'
        
        if (isVideoProcessing) {
          const videoCreatedAt = new Date(video.created_at)
          const now = new Date()
          const elapsedSeconds = Math.floor((now.getTime() - videoCreatedAt.getTime()) / 1000)
          
          currentlyProcessing.push({
            video,
            analysis,
            startTime: videoCreatedAt,
            elapsedSeconds
          })
        }
      })

      console.log(`📊 Processing status: ${currentlyProcessing.length} videos processing`)
      
      setIsProcessing(currentlyProcessing.length > 0)
      setProcessingVideos(currentlyProcessing)
      setLastCheckTime(new Date())
      setError(null)
      
      // Log processing videos for debugging
      if (currentlyProcessing.length > 0) {
        currentlyProcessing.forEach(({ video, analysis, elapsedSeconds }) => {
          console.log(`⏳ Video "${video.original_name}" - Status: ${analysis?.status || 'No analysis'} - Elapsed: ${elapsedSeconds}s`)
        })
      }
      
    } catch (err) {
      console.error('❌ Error checking processing status:', err)
      setError(err instanceof Error ? err.message : 'Error checking video status')
    }
  }, [projectId, supabase])

  // Start polling when component mounts or projectId changes
  useEffect(() => {
    if (!projectId) {
      setIsProcessing(false)
      setProcessingVideos([])
      return
    }

    console.log('🚀 Starting video processing monitor for project:', projectId)
    
    // Initial check
    checkProcessingStatus()

    // Start polling every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      checkProcessingStatus()
    }, 5000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [projectId, checkProcessingStatus])

  // Subscribe to real-time changes on video_analysis table
  useEffect(() => {
    if (!projectId || !supabase) return

    console.log('🔔 Setting up real-time subscription for video analysis changes')

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase
      .channel(`video_analysis_changes_${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_analysis',
      }, (payload) => {
        console.log('🔔 Real-time video analysis change detected:', payload)
        
        // Check if this change affects our project
        // We'll recheck status for any video_analysis change to be safe
        setTimeout(() => {
          checkProcessingStatus()
        }, 1000) // Small delay to ensure DB consistency
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [projectId, supabase, checkProcessingStatus])

  // Update elapsed time for processing videos every second
  useEffect(() => {
    if (processingVideos.length === 0) return

    const timer = setInterval(() => {
      setProcessingVideos(prev => 
        prev.map(info => ({
          ...info,
          elapsedSeconds: Math.floor((new Date().getTime() - info.startTime.getTime()) / 1000)
        }))
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [processingVideos.length])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  // Helper function to format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Get the most recently uploaded processing video (for single upload UX)
  const currentProcessingVideo = processingVideos.length > 0 ? processingVideos[0] : null

  return {
    isProcessing,
    processingVideos,
    currentProcessingVideo,
    error,
    lastCheckTime,
    checkStatus: checkProcessingStatus,
    formatElapsedTime,
    
    // Helper functions for UI
    getProcessingCount: () => processingVideos.length,
    getOldestProcessingVideo: () => processingVideos.length > 0 
      ? processingVideos.reduce((oldest, current) => 
          current.startTime < oldest.startTime ? current : oldest
        ) 
      : null,
    
    // Check if a specific video is processing
    isVideoProcessing: (videoId: string) => 
      processingVideos.some(info => info.video.id === videoId),
      
    // Get processing info for a specific video
    getVideoProcessingInfo: (videoId: string) => 
      processingVideos.find(info => info.video.id === videoId)
  }
}