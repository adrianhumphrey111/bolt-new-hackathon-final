'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { videoPollingService, VideoStatus } from '../lib/videoPollingService'

interface Video {
  id: string
  file_name: string
  original_name: string
  file_path: string
  status: string
  created_at: string
  project_id: string
}

interface ProcessingVideoInfo {
  video: Video
  status: VideoStatus
  startTime: Date
  elapsedSeconds: number
}

export function useVideoProcessingV2(projectId: string | null) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingVideos, setProcessingVideos] = useState<ProcessingVideoInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  
  const supabase = createClientComponentClient()
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map())

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

      // Get statuses for all videos using the centralized service
      const videoIds = videos.map(v => v.id)
      const statuses = await videoPollingService.getMultipleVideoStatuses(videoIds)
      
      // Find videos that are still processing
      const currentlyProcessing: ProcessingVideoInfo[] = []
      
      videos.forEach(video => {
        const status = statuses.find(s => s.id === video.id)
        
        // Video is processing if status indicates it's not completed
        const isVideoProcessing = !status || 
          status.status === 'processing' || 
          status.status === 'uploading'
        
        if (isVideoProcessing && status) {
          const videoCreatedAt = new Date(video.created_at)
          const now = new Date()
          const elapsedSeconds = Math.floor((now.getTime() - videoCreatedAt.getTime()) / 1000)
          
          currentlyProcessing.push({
            video,
            status,
            startTime: videoCreatedAt,
            elapsedSeconds
          })
        }
      })

      setProcessingVideos(currentlyProcessing)
      setIsProcessing(currentlyProcessing.length > 0)
      setLastCheckTime(new Date())
      
      console.log('📊 Processing status updated:', {
        total: videos.length,
        processing: currentlyProcessing.length,
        completed: videos.length - currentlyProcessing.length
      })
    } catch (error) {
      console.error('Error checking processing status:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [projectId, supabase])

  // Subscribe to video status changes
  useEffect(() => {
    if (!projectId) return

    const subscribeToVideoUpdates = async () => {
      // Get all videos for the project
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id')
        .eq('project_id', projectId)

      if (videosError || !videos) return

      // Clear existing subscriptions
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe())
      subscriptionsRef.current.clear()

      // Subscribe to each video's status updates
      videos.forEach(video => {
        const unsubscribe = videoPollingService.subscribe(video.id, (status) => {
          console.log(`Video ${video.id} status update:`, status)
          
          // Update the processing videos state
          setProcessingVideos(prev => {
            const updated = [...prev]
            const index = updated.findIndex(pv => pv.video.id === video.id)
            
            if (status.status === 'completed' || status.status === 'failed') {
              // Remove from processing list
              if (index !== -1) {
                updated.splice(index, 1)
              }
            } else if (status.status === 'processing' || status.status === 'uploading') {
              // Add or update in processing list
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  status,
                  elapsedSeconds: Math.floor((new Date().getTime() - updated[index].startTime.getTime()) / 1000)
                }
              }
            }
            
            return updated
          })
          
          // Update processing state
          setIsProcessing(prev => {
            const stillProcessing = status.status === 'processing' || status.status === 'uploading'
            if (!stillProcessing) {
              // Check if any other videos are still processing
              const otherProcessing = subscriptionsRef.current.size > 1
              return otherProcessing
            }
            return true
          })
        })
        
        subscriptionsRef.current.set(video.id, unsubscribe)
      })
    }

    subscribeToVideoUpdates()

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe())
      subscriptionsRef.current.clear()
    }
  }, [projectId, supabase])

  // Initial check
  useEffect(() => {
    checkProcessingStatus()
  }, [checkProcessingStatus])

  const startMonitoring = useCallback(() => {
    checkProcessingStatus()
  }, [checkProcessingStatus])

  const stopMonitoring = useCallback(() => {
    subscriptionsRef.current.forEach(unsubscribe => unsubscribe())
    subscriptionsRef.current.clear()
    setIsProcessing(false)
    setProcessingVideos([])
  }, [])

  return {
    isProcessing,
    processingVideos,
    error,
    lastCheckTime,
    startMonitoring,
    stopMonitoring,
    checkProcessingStatus
  }
}