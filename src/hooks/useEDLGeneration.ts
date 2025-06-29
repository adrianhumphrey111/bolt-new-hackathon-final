'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface EDLGenerationStep {
  step_number: number
  agent_name: string
  step_name: string
  status: string
  started_at: string
  completed_at?: string
  duration_seconds?: number
  error_message?: string
}

interface EDLGenerationJob {
  jobId: string
  status: string
  currentStep: string
  progress: {
    completed: number
    total: number
    percentage: number
  }
  timing: {
    createdAt: string
    startedAt?: string
    completedAt?: string
  }
  error?: {
    message: string
    step: string
  }
  results?: {
    finalDuration: number
    scriptCoverage: number
    totalChunks: number
    canCreateTimeline: boolean
    shotList: any[]
  }
  steps: EDLGenerationStep[]
}

export function useEDLGeneration(projectId: string | null) {
  const [currentJob, setCurrentJob] = useState<EDLGenerationJob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  
  const supabase = createClientComponentClient()
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  // Start EDL generation
  const startGeneration = useCallback(async (userIntent: string, scriptContent?: string) => {
    if (!projectId) {
      setError('No project selected')
      return null
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIntent,
          scriptContent: scriptContent || ''
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start EDL generation')
      }

      console.log('🚀 EDL generation started:', data.jobId)
      
      // Start polling for status
      startPolling(data.jobId)
      
      return data.jobId
    } catch (err) {
      console.error('❌ Error starting EDL generation:', err)
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setIsGenerating(false)
      return null
    }
  }, [projectId])

  // Check job status
  const checkJobStatus = useCallback(async (jobId: string) => {
    if (!projectId) return

    try {
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async?jobId=${jobId}`)
      const jobData = await response.json()

      if (!response.ok) {
        throw new Error(jobData.error || 'Failed to get job status')
      }

      console.log('📊 Job status:', jobData.status, `${jobData.progress.percentage}%`)
      
      setCurrentJob(jobData)
      setLastCheckTime(new Date())
      setError(null)

      // Stop polling if job is complete or failed
      if (jobData.status === 'completed' || jobData.status === 'failed') {
        setIsGenerating(false)
        stopPolling()
        
        if (jobData.status === 'failed' && jobData.error) {
          setError(`Generation failed: ${jobData.error.message}`)
        }
      }

      return jobData
    } catch (err) {
      console.error('❌ Error checking job status:', err)
      // Don't set error for polling failures - only show errors when job status is 'failed'
      return null
    }
  }, [projectId])

  // Start polling for job status
  const startPolling = useCallback((jobId: string) => {
    console.log('🔄 Starting polling for job:', jobId)
    
    // Initial check
    checkJobStatus(jobId)

    // Start polling every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      checkJobStatus(jobId)
    }, 3000)
  }, [checkJobStatus])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      console.log('⏹️ Stopped polling')
    }
  }, [])

  // Subscribe to real-time changes on edl_generation_jobs table
  useEffect(() => {
    if (!projectId || !supabase) return

    console.log('🔔 Setting up real-time subscription for EDL generation changes')

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase
      .channel(`edl_generation_changes_${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'edl_generation_jobs',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('🔔 Real-time EDL generation change detected:', payload)
        
        // If we have a current job, refresh its status
        if (currentJob) {
          setTimeout(() => {
            checkJobStatus(currentJob.jobId)
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
  }, [projectId, supabase, currentJob, checkJobStatus])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling()
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [stopPolling])

  // Helper function to format elapsed time
  const formatElapsedTime = (startTime: string): string => {
    const start = new Date(startTime)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - start.getTime()) / 1000)
    
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Get current step status
  const getCurrentStepStatus = (): string => {
    if (!currentJob) return 'Not started'
    
    if (currentJob.status === 'completed') return 'Completed'
    if (currentJob.status === 'failed') return 'Failed'
    if (currentJob.status === 'pending') return 'Initializing...'
    
    return currentJob.currentStep || 'Processing...'
  }

  return {
    // State
    currentJob,
    isGenerating,
    error,
    lastCheckTime,
    
    // Actions
    startGeneration,
    checkJobStatus,
    stopPolling,
    
    // Helpers
    formatElapsedTime,
    getCurrentStepStatus,
    
    // Status checks
    canCreateTimeline: currentJob?.results?.canCreateTimeline || false,
    isComplete: currentJob?.status === 'completed',
    isFailed: currentJob?.status === 'failed',
    progress: currentJob?.progress?.percentage || 0,
    
    // Results
    shotList: currentJob?.results?.shotList || [],
    finalDuration: currentJob?.results?.finalDuration,
    scriptCoverage: currentJob?.results?.scriptCoverage,
  }
}