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

export function useEDLGeneration(projectId: string | null, session?: any, checkForExistingJobs: boolean = false) {
  const [currentJob, setCurrentJob] = useState<EDLGenerationJob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  const [creditError, setCreditError] = useState<{
    requiredCredits: number;
    availableCredits: number;
  } | null>(null)
  
  const supabase = createClientComponentClient()
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async () => {
    // First try to use the passed session, then fallback to getting it from supabase
    let currentSession = session;
    if (!currentSession) {
      const { data: { session: fetchedSession }, error } = await supabase.auth.getSession();
      currentSession = fetchedSession;
      
      if (error) {
        console.error('Error getting session:', error);
      }
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentSession?.access_token) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    }
    
    return headers;
  }, [supabase, session]);

  // Start EDL generation
  const startGeneration = useCallback(async (userIntent: string, scriptContent?: string) => {
    if (!projectId) {
      setError('No project selected')
      return null
    }

    setIsGenerating(true)
    setError(null)
    setCreditError(null) // Clear any previous credit errors

    try {
      const headers = await getAuthHeaders();
      
      // Validate that we have auth headers before proceeding
      if (!headers['Authorization']) {
        throw new Error('Authentication required. Please sign in and try again.');
      }
      
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userIntent,
          scriptContent: scriptContent || ''
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 402 Payment Required specifically
        if (response.status === 402) {
          setCreditError({
            requiredCredits: data.creditsRequired || 1,
            availableCredits: data.creditsAvailable || 0
          })
          setError(null) // Don't show generic error for credit issues
          setIsGenerating(false)
          return null
        }
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
      setCreditError(null) // Clear credit error on other errors
      return null
    }
  }, [projectId, getAuthHeaders])

  // Clear credit error function
  const clearCreditError = useCallback(() => {
    setCreditError(null)
  }, [])

  // Check job status
  const checkJobStatus = useCallback(async (jobId: string) => {
    if (!projectId) return

    try {
      const headers = await getAuthHeaders();
      
      // For status checks, we can be more lenient - just log if no auth instead of failing
      if (!headers['Authorization']) {
        console.warn('No auth headers available for status check');
      }
      
      const response = await fetch(`/api/timeline/${projectId}/generate-edl-async?jobId=${jobId}`, {
        headers
      })
      const jobData = await response.json()

      if (!response.ok) {
        throw new Error(jobData.error || 'Failed to get job status')
      }

      console.log('📊 Job status:', jobData.status, `${jobData.progress.percentage}%`)
      
      // Process and sort steps by step_number to ensure correct ordering
      if (jobData.steps && Array.isArray(jobData.steps)) {
        jobData.steps = jobData.steps.sort((a: any, b: any) => a.step_number - b.step_number)
      }
      
      setCurrentJob(jobData)
      setLastCheckTime(new Date())
      setError(null)

      // Check if SHOT_LIST_GENERATOR step is complete
      const shotListGeneratorStep = jobData.steps?.find(
        (step: any) => step.agent_name === 'SHOT_LIST_GENERATOR' || step.step_name.includes('SHOT_LIST_GENERATOR')
      )
      
      const isShotListReady = shotListGeneratorStep?.status === 'completed'

      // Stop generating status and polling when shot list is ready OR job is complete/failed
      if (jobData.status === 'completed' || jobData.status === 'failed' || isShotListReady) {
        setIsGenerating(false)
        stopPolling()
        
        if (isShotListReady && jobData.status === 'running') {
          console.log('🎉 Shot list ready! Timeline can now be applied. Stopping polling.')
        }
        
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
  }, [projectId, getAuthHeaders])

  // Start polling for job status
  const startPolling = useCallback((jobId: string) => {
    console.log('🔄 Starting polling for job:', jobId)
    
    // Initial check
    checkJobStatus(jobId)

    // Start polling every 2 seconds for more responsive updates
    pollIntervalRef.current = setInterval(() => {
      checkJobStatus(jobId)
    }, 2000)
  }, [checkJobStatus])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      console.log('⏹️ Stopped polling')
    }
  }, [])

  // Subscribe to real-time changes on edl_generation_jobs table , we do not need this for now
  // useEffect(() => {
  //   if (!projectId || !supabase) return

  //   console.log('🔔 Setting up real-time subscription for EDL generation changes')

  //   // Clean up existing subscription
  //   if (channelRef.current) {
  //     channelRef.current.unsubscribe()
  //   }

  //   const channel = supabase
  //     .channel(`edl_generation_changes_${projectId}`)
  //     .on('postgres_changes', {
  //       event: '*',
  //       schema: 'public',
  //       table: 'edl_generation_jobs',
  //       filter: `project_id=eq.${projectId}`
  //     }, (payload) => {
  //       console.log('🔔 Real-time EDL generation change detected:', payload)
        
  //       // If we have a current job, refresh its status
  //       if (currentJob) {
  //         setTimeout(() => {
  //           checkJobStatus(currentJob.jobId)
  //         }, 1000) // Small delay to ensure DB consistency
  //       }
  //     })
  //     .subscribe()

  //   channelRef.current = channel

  //   return () => {
  //     if (channelRef.current) {
  //       channelRef.current.unsubscribe()
  //       channelRef.current = null
  //     }
  //   }
  // }, [projectId, supabase, currentJob, checkJobStatus])

  // Check for existing active jobs when projectId changes (only if explicitly requested)
  useEffect(() => {
    if (!projectId || !checkForExistingJobs) return

    const checkForExistingJob = async () => {
      try {
        const headers = await getAuthHeaders()
        
        // For initial checks, we can be more lenient with auth
        if (!headers['Authorization']) {
          console.log('No auth headers available for existing job check, skipping...')
          return
        }
        
        const response = await fetch(`/api/timeline/${projectId}/generate-edl-async`, {
          headers
        })
        
        if (response.ok) {
          const jobData = await response.json()
          
          // If we find an active job, resume tracking it
          if (jobData.status === 'running' || jobData.status === 'pending') {
            console.log('🔄 Found existing active job, resuming tracking:', jobData.jobId)
            setCurrentJob(jobData)
            setIsGenerating(true)
            startPolling(jobData.jobId)
          } else if (jobData.status === 'completed' || jobData.status === 'failed') {
            // Show completed/failed job but don't start polling
            console.log('📋 Found existing completed/failed job:', jobData.jobId, jobData.status)
            setCurrentJob(jobData)
            setIsGenerating(false)
          }
        }
      } catch (error) {
        console.error('Error checking for existing job:', error)
      }
    }

    checkForExistingJob()
  }, [projectId, getAuthHeaders, startPolling, checkForExistingJobs])

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
    
    if (currentJob.status === 'completed') return 'All steps completed successfully'
    if (currentJob.status === 'failed') return 'Generation failed'
    if (currentJob.status === 'pending') return 'Initializing...'
    
    // Find the currently running step
    if (currentJob.steps && Array.isArray(currentJob.steps)) {
      const runningStep = currentJob.steps.find(step => step.status === 'running')
      if (runningStep) {
        return `Running: ${runningStep.step_name}`
      }
      
      // If no running step, find the last completed step
      const completedSteps = currentJob.steps.filter(step => step.status === 'completed')
      if (completedSteps.length > 0) {
        const nextStepNumber = completedSteps.length + 1
        const nextStep = currentJob.steps.find(step => step.step_number === nextStepNumber)
        if (nextStep) {
          return `Starting: ${nextStep.step_name}`
        }
      }
    }
    
    return currentJob.currentStep || 'Processing...'
  }

  // Helper function to check if SHOT_LIST_GENERATOR step is complete
  const isShotListGeneratorComplete = (): boolean => {
    if (!currentJob?.steps) return false
    
    const shotListGeneratorStep = currentJob.steps.find(
      step => step.agent_name === 'SHOT_LIST_GENERATOR' || step.step_name.includes('SHOT_LIST_GENERATOR')
    )
    
    return shotListGeneratorStep?.status === 'completed'
  }

  // Helper function to check if timeline can be created (shot list is ready)
  const canCreateTimelineFromShotList = (): boolean => {
    return isShotListGeneratorComplete() && (currentJob?.results?.shotList?.length || 0) > 0
  }

  // Helper function to check if generation is effectively complete (shot list ready)
  const isEffectivelyComplete = (): boolean => {
    return currentJob?.status === 'completed' || isShotListGeneratorComplete()
  }

  return {
    // State
    currentJob,
    isGenerating,
    error,
    lastCheckTime,
    creditError,
    
    // Actions
    startGeneration,
    checkJobStatus,
    stopPolling,
    clearCreditError,
    
    // Helpers
    formatElapsedTime,
    getCurrentStepStatus,
    
    // Status checks
    canCreateTimeline: canCreateTimelineFromShotList(),
    isComplete: isEffectivelyComplete(),
    isFailed: currentJob?.status === 'failed',
    progress: currentJob?.progress?.percentage || 0,
    
    // Results
    shotList: currentJob?.results?.shotList || [],
    finalDuration: currentJob?.results?.finalDuration,
    scriptCoverage: currentJob?.results?.scriptCoverage,
  }
}