'use client'

import { useState, useEffect } from 'react'

interface ReprocessResult {
  success: boolean
  message: string
  processed: number
  errors: number
  details?: {
    successful: Array<{ video_id: string; status: string; file_path: string }>
    errors: Array<{ video_id: string; error: string }>
  }
}

interface VideoNeedingReprocess {
  id: string
  file_path: string
  original_name: string
  project_id: string
  created_at: string
  video_analysis: Array<{
    id: string
    status: string
    processing_completed_at: string | null
  }> | null
}

export function ReprocessVideosButton() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [videosToReprocess, setVideosToReprocess] = useState<VideoNeedingReprocess[]>([])
  const [result, setResult] = useState<ReprocessResult | null>(null)

  // Debug effect to track modal state changes
  useEffect(() => {
    console.log('Modal state changed:', showModal)
  }, [showModal])

  const fetchVideosNeedingReprocess = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/videos-needing-reprocess')
      const data = await response.json()
      
      console.log('Fetched videos needing reprocess:', data)
      
      if (data.videos) {
        setVideosToReprocess(data.videos)
        console.log('Setting modal to show with', data.videos.length, 'videos')
        setShowModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReprocess = async () => {
    setIsProcessing(true)
    setResult(null)
    setShowModal(false)

    try {
      const response = await fetch('/api/admin/reprocess-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to start reprocessing',
        processed: 0,
        errors: 1
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Video Analysis Reprocessing
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Reprocess all videos that don't have completed analysis. This will trigger the Lambda function for each video.
      </p>

      <button
        onClick={fetchVideosNeedingReprocess}
        disabled={isLoading || isProcessing}
        className={`px-4 py-2 rounded-lg text-white font-medium ${
          isLoading || isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Loading...' : isProcessing ? 'Processing...' : 'Check Videos for Reprocessing'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`font-medium ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.message}
          </div>
          
          {result.success && (
            <div className="mt-2 text-sm text-green-700">
              <div>✅ Successfully started: {result.processed} videos</div>
              {result.errors > 0 && (
                <div>❌ Errors: {result.errors} videos</div>
              )}
            </div>
          )}

          {result.details && result.details.successful.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                View processed videos ({result.details.successful.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {result.details.successful.map((video, index) => (
                  <div key={index} className="text-xs text-gray-600 py-1 border-b border-gray-100">
                    {video.video_id} - {video.file_path}
                  </div>
                ))}
              </div>
            </details>
          )}

          {result.details && result.details.errors.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-red-700">
                View errors ({result.details.errors.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {result.details.errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 py-1 border-b border-red-100">
                    {error.video_id}: {error.error}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Modal for showing videos needing reprocess */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              console.log('Closing modal via backdrop click')
              setShowModal(false)
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Videos Needing Reprocessing ({videosToReprocess.length})
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                These videos don't have completed analysis and will be reprocessed with the Lambda function.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {videosToReprocess.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No videos need reprocessing. All videos have completed analysis!</p>
              ) : (
                <div className="space-y-3">
                  {videosToReprocess.map((video) => (
                    <div key={video.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {video.original_name || 'Unnamed Video'}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            ID: {video.id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Path: {video.file_path}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Uploaded: {new Date(video.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            video.video_analysis?.length === 0 || !video.video_analysis
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {video.video_analysis?.length === 0 || !video.video_analysis
                              ? 'No Analysis'
                              : `Status: ${video.video_analysis[0]?.status || 'Unknown'}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  console.log('Cancel button clicked')
                  setShowModal(false)
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              {videosToReprocess.length > 0 && (
                <button
                  onClick={() => {
                    console.log('Reprocess button clicked')
                    handleReprocess()
                  }}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : `Reprocess ${videosToReprocess.length} Videos`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}