"use client";

import React, { useState } from 'react';
import { useEDLGeneration } from '../../hooks/useEDLGeneration';
import { useTimeline } from './TimelineContext';

interface GenerateAIModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (shotList: any[]) => void;
}

export function GenerateAIModal({ projectId, isOpen, onClose, onComplete }: GenerateAIModalProps) {
  const [userIntent, setUserIntent] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const { actions } = useTimeline();

  const {
    currentJob,
    isGenerating,
    error,
    startGeneration,
    formatElapsedTime,
    getCurrentStepStatus,
    canCreateTimeline,
    isComplete,
    progress,
    shotList
  } = useEDLGeneration(projectId);

  const handleStartGeneration = async () => {
    if (!userIntent.trim()) {
      alert('Please enter your video intent');
      return;
    }

    const jobId = await startGeneration(userIntent, scriptContent);
    if (jobId) {
      console.log('Generation started with job ID:', jobId);
    }
  };

  const handleCreateTimeline = () => {
    if (canCreateTimeline && shotList.length > 0) {
      // Clear existing timeline
      actions.clearTimeline();
      
      // Convert shot list to timeline items
      shotList.forEach((shot: any, index: number) => {
        const startTime = shot.start_frame || (index * 180); // Default 6 seconds per clip if no start_frame
        const duration = shot.duration_frames || 150; // Default 5 seconds if no duration
        
        // Find or create a track
        let trackId = '';
        if (actions.state?.tracks && actions.state.tracks.length > 0) {
          trackId = actions.state.tracks[0].id;
        } else {
          actions.addTrack();
          // We'll use a placeholder and let the reducer handle it
          trackId = 'new-track';
        }

        // Extract timing information from shot
        const preciseTiming = shot.precise_timing || {};
        const originalStartTime = preciseTiming.start || 0;
        const originalEndTime = preciseTiming.end || 0;
        
        actions.addItem({
          type: 'video' as any,
          name: shot.clip_name || shot.file_name || `Clip ${index + 1}`,
          startTime: startTime,
          duration: duration,
          trackId: trackId,
          src: shot.src || shot.s3_url || shot.file_path,
          content: undefined,
          properties: {
            originalStartTime: originalStartTime,
            originalEndTime: originalEndTime,
            trim_start: originalStartTime,
            trim_end: originalEndTime,
            video_id: shot.video_id,
            chunk_id: shot.chunk_id,
            ai_generated: true
          }
        });
      });

      onComplete?.(shotList);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div>
            <h2 className="text-xl font-bold text-white">Generate with AI</h2>
            <p className="text-gray-400 text-sm">Let AI automatically edit your video</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isGenerating && !currentJob && (
            <div className="space-y-6">
              {/* User Intent Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What kind of video do you want to create? *
                </label>
                <textarea
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="Example: Create a 2-minute promotional video showcasing our product features with an engaging intro and call-to-action"
                  className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Script Content Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Script or Outline (Optional)
                </label>
                <textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  placeholder="Enter your script, outline, or key talking points here..."
                  className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-blue-300 text-sm">
                    <p className="font-medium mb-1">AI will analyze your videos and create a timeline based on:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-400">
                      <li>Your video intent and goals</li>
                      <li>Scene analysis and content matching</li>
                      <li>Script alignment (if provided)</li>
                      <li>Optimal sequence and timing</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-400">This process typically takes 2-3 minutes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {(isGenerating || currentJob) && (
            <div className="space-y-6">
              {/* Progress Header */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {isComplete ? '🎉 Generation Complete!' : '🤖 AI is editing your video...'}
                </h3>
                <p className="text-gray-400">
                  {isComplete 
                    ? 'Your AI-generated timeline is ready!' 
                    : getCurrentStepStatus()
                  }
                </p>
              </div>

              {/* Progress Bar */}
              {currentJob && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-blue-400 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {currentJob.timing.startedAt && (
                    <div className="text-center text-xs text-gray-500">
                      Elapsed: {formatElapsedTime(currentJob.timing.startedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Steps */}
              {currentJob?.steps && currentJob.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Processing Steps:</h4>
                  {currentJob.steps.map((step, index) => (
                    <div key={step.step_number} className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step.status === 'completed' 
                          ? 'bg-green-600 text-white' 
                          : step.status === 'running'
                            ? 'bg-blue-600 text-white'
                            : step.status === 'failed'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-600 text-gray-300'
                      }`}>
                        {step.status === 'completed' ? '✓' : 
                         step.status === 'running' ? '⟳' :
                         step.status === 'failed' ? '✗' : step.step_number}
                      </div>
                      <span className={`text-sm ${
                        step.status === 'completed' ? 'text-green-400' :
                        step.status === 'running' ? 'text-blue-400' :
                        step.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {step.step_name}
                      </span>
                      {step.status === 'running' && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {isComplete && currentJob?.results && (
                <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-3">Generation Results:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Final Duration:</span>
                      <div className="text-white font-medium">{currentJob.results.finalDuration}s</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Script Coverage:</span>
                      <div className="text-white font-medium">{currentJob.results.scriptCoverage}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Clips Used:</span>
                      <div className="text-white font-medium">{shotList.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Segments:</span>
                      <div className="text-white font-medium">{currentJob.results.totalChunks}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-300 font-medium">Generation Failed</span>
                  </div>
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-600 p-6">
          <div className="flex justify-end space-x-3">
            {!isGenerating && !currentJob && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartGeneration}
                  disabled={!userIntent.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors font-medium"
                >
                  Generate Timeline
                </button>
              </>
            )}

            {(isGenerating || currentJob) && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                {canCreateTimeline && (
                  <button
                    onClick={handleCreateTimeline}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
                  >
                    Apply to Timeline
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}