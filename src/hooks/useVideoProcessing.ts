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

  // Start polling only when there are videos being processed
  useEffect(() => {
    if (!projectId) {
      setIsProcessing(false)
      setProcessingVideos([])
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    console.log('🚀 Starting initial video processing check for project:', projectId)
    
    // Initial check
    checkProcessingStatus()

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [projectId, checkProcessingStatus])

  // Manage polling based on processing state
  useEffect(() => {
    // Clear any existing poll
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Only start polling if we have videos being processed
    if (isProcessing && processingVideos.length > 0) {
      console.log(`🔄 Starting polling for ${processingVideos.length} processing videos`)
      
      pollIntervalRef.current = setInterval(() => {
        checkProcessingStatus()
      }, 5000) // Poll every 5 seconds while processing
    } else {
      console.log('⏹️ No videos processing - stopping poll')
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isProcessing, processingVideos.length, checkProcessingStatus])

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
        
        // Only recheck if we're currently processing or this could start processing
        if (isProcessing || payload.eventType === 'INSERT' || 
            (payload.new && ['processing', 'pending', 'queued'].includes((payload.new as any).status))) {
          setTimeout(() => {
            checkProcessingStatus()
          }, 1000) // Small delay to ensure DB consistency
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [projectId, supabase, checkProcessingStatus, isProcessing])

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

  // Function to manually start monitoring after upload
  const startMonitoring = useCallback(() => {
    console.log('🎬 Starting video processing monitoring after upload')
    checkProcessingStatus()
  }, [checkProcessingStatus])

  // Memoize helper functions to prevent unnecessary re-renders
  const getProcessingCount = useCallback(() => processingVideos.length, [processingVideos.length])
  
  const getOldestProcessingVideo = useCallback(() => {
    return processingVideos.length > 0 
      ? processingVideos.reduce((oldest, current) => 
          current.startTime < oldest.startTime ? current : oldest
        ) 
      : null
  }, [processingVideos])
  
  const isVideoProcessing = useCallback((videoId: string) => 
    processingVideos.some(info => info.video.id === videoId), 
    [processingVideos]
  )
  
  const getVideoProcessingInfo = useCallback((videoId: string) => 
    processingVideos.find(info => info.video.id === videoId), 
    [processingVideos]
  )

  return {
    isProcessing,
    processingVideos,
    currentProcessingVideo,
    error,
    lastCheckTime,
    checkStatus: checkProcessingStatus,
    startMonitoring, // Expose this for manual triggering after uploads
    formatElapsedTime,
    
    // Helper functions for UI (now memoized)
    getProcessingCount,
    getOldestProcessingVideo,
    isVideoProcessing,
    getVideoProcessingInfo
  }
}