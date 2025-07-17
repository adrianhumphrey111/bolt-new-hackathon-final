"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTimeline } from './TimelineContext';
import { useAuthContext } from '../AuthProvider';
import { createClientSupabaseClient } from '../../lib/supabase/client';

interface GenerateAIModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerationJobSuccessfully?: (timelineData: any) => void;
}

const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok', description: 'Vertical 9:16, 15-60 seconds' },
  { value: 'youtube', label: 'YouTube', description: 'Horizontal 16:9, 5-20 minutes' },
  { value: 'instagram', label: 'Instagram', description: 'Square 1:1 or vertical 9:16' },
  { value: 'twitter', label: 'Twitter/X', description: 'Horizontal 16:9, up to 2 minutes' },
  { value: 'linkedin', label: 'LinkedIn', description: 'Horizontal 16:9, professional' },
];

export function GenerateAIModal({ projectId, isOpen, onClose, onGenerationJobSuccessfully }: GenerateAIModalProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { actions } = useTimeline();
  const { isAuthenticated, loading: authLoading, session } = useAuthContext();
  const supabase = createClientSupabaseClient();

  // Poll for job status
  const pollJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const { data, error } = await supabase
        .from('edl_generation_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) {
        console.error('Error polling job status:', error);
        return;
      }

      if (data) {
        setJobStatus(data.status_message || data.status);
        
        // If job is complete, fetch new timeline and call callback
        if (data.status === 'completed') {
          setIsGenerating(false);
          // Fetch the new timeline data
          try {
            const response = await fetch(`/api/timeline/${projectId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const timelineData = await response.json();
              if (timelineData && onGenerationJobSuccessfully) {
                // Call the callback with the timeline data
                onGenerationJobSuccessfully(timelineData);
              }
            }
            onClose(); // Close modal after successful completion
          } catch (err) {
            console.error('Failed to fetch new timeline:', err);
            // Still close modal but don't update timeline
            onClose();
          }
        } else if (data.status === 'failed') {
          setIsGenerating(false);
          setError(data.error_message || 'Generation failed');
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, [jobId, supabase]);

  // Set up polling when job starts
  useEffect(() => {
    if (!jobId || !isGenerating) return;

    const interval = setInterval(pollJobStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [jobId, isGenerating, pollJobStatus]);

  // Helper function to get step status display
  const getStepStatusIcon = (step: any) => {
    switch (step.status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'failed':
        return '✗';
      default:
        return step.step_number;
    }
  };

  const getStepStatusColor = (step: any) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'running':
        return 'bg-blue-600 text-white';
      case 'failed':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-gray-300';
    }
  };

  const getStepTextColor = (step: any) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-blue-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleStartGeneration = async () => {
    if (!userPrompt.trim()) {
      alert('Please enter your video prompt');
      return;
    }

    // Prevent starting a new job if one is already running
    if (isGenerating) {
      alert('AI generation is already in progress. Please wait for it to complete before starting a new one.');
      return;
    }

    // Check authentication state before proceeding
    if (!isAuthenticated) {
      alert('Please sign in to generate timelines');
      return;
    }

    if (authLoading) {
      alert('Authentication is still loading. Please wait a moment and try again.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setJobStatus('Starting generation...');

    try {
      const response = await fetch(`/api/timeline/${projectId}/generate-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_prompt: userPrompt,
          platform: platform
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start generation');
      }

      if (result.success && result.job_id) {
        setJobId(result.job_id);
        setJobStatus(result.message || 'Generation started');
        console.log('Generation started with job ID:', result.job_id);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error starting generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setIsGenerating(false);
    }
  };

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setUserPrompt('');
      setPlatform('tiktok');
      setIsGenerating(false);
      setJobId(null);
      setJobStatus('');
      setError(null);
    }
  }, [isOpen]);

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
          {!isGenerating && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isGenerating && (
            <div className="space-y-6">
              {/* User Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What kind of video do you want to create? *
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Example: Create an engaging TikTok video that tells the complete story from the available content"
                  className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Platform *
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} - {p.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-blue-300 text-sm">
                    <p className="font-medium mb-1">AI will analyze your videos and create a timeline using:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-400">
                      <li>Content Intelligence Agent for strategic planning</li>
                      <li>Precision Shot Cutter for optimal timing</li>
                      <li>Platform-specific optimization</li>
                      <li>Story coherence and engagement</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-400">This process typically takes 1-2 minutes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-6">
              {/* Progress Header */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  🤖 AI is editing your video...
                </h3>
                <p className="text-gray-400">
                  {jobStatus || 'Processing your request...'}
                </p>
              </div>

              {/* Progress Animation */}
              <div className="space-y-3">
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-blue-500 transition-all duration-500 animate-pulse"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="text-center text-xs text-gray-500">
                  Job ID: {jobId}
                </div>
              </div>

              {/* Processing Steps */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Processing Steps:</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-400">
                        Content Intelligence Agent
                      </span>
                      <div className="text-xs text-gray-500">
                        Analyzing content and creating strategic plan
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-600 text-gray-300 flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-400">
                        Precision Shot Cutter
                      </span>
                      <div className="text-xs text-gray-500">
                        Refining cut timing for optimal storytelling
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-600 text-gray-300 flex items-center justify-center text-xs font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-400">
                        Timeline Assembly
                      </span>
                      <div className="text-xs text-gray-500">
                        Building final timeline configuration
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
            {!isGenerating && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartGeneration}
                  disabled={!userPrompt.trim() || !isAuthenticated || authLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors font-medium"
                >
                  {authLoading ? 'Authenticating...' : !isAuthenticated ? 'Sign in Required' : 'Generate Timeline'}
                </button>
              </>
            )}

            {isGenerating && (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-400">
                  Generation in progress...
                </div>
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}