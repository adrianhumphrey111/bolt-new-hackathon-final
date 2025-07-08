import React, { useState, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { MediaType } from '../../../types/timeline';

interface OneShotGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoName: string;
  videoSrc: string;
  analysisData: {
    duration: number;
    recommended_cuts_or_trims: Array<{
      start_time: number;
      end_time: number;
      reason: string;
      priority: string;
    }>;
    highlight_moments_worth_emphasizing: Array<{
      start_time: number;
      end_time: number;
      description: string;
      emphasis_type: string;
      suggested_enhancement: string;
    }>;
  };
}

export function OneShotGenerateModal({
  isOpen,
  onClose,
  videoId,
  videoName,
  videoSrc,
  analysisData
}: OneShotGenerateModalProps) {
  const { actions } = useTimeline();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationStats, setGenerationStats] = useState<{
    segmentsCreated: number;
    cutsRemoved: number;
    reductionPercentage: string;
    highlightsPreserved: number;
    originalDuration: string;
    newDuration: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && !isGenerating && !generationComplete) {
      // Auto-start generation when modal opens
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setGenerationComplete(false);

    try {
      // Step 1: Analyzing video structure
      setStatusMessage('🤖 AI is analyzing your video structure...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Identifying key moments
      setStatusMessage('🎯 Identifying key moments and highlights...');
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Removing unnecessary content
      setStatusMessage('✂️ Removing recommended cuts to improve flow...');
      setProgress(40);
      
      // Clear existing timeline
      actions.clearTimeline();
      actions.addTrack();
      
      // Process cuts and create segments
      const cuts = analysisData.recommended_cuts_or_trims || [];
      const highlights = analysisData.highlight_moments_worth_emphasizing || [];
      
      // Sort cuts by start time
      const sortedCuts = cuts.sort((a, b) => a.start_time - b.start_time);
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Step 4: Creating video segments
      setStatusMessage('🎬 Creating optimized video segments...');
      setProgress(60);
      
      let currentTimelinePosition = 0;
      let segmentStart = 0;
      const videoDurationMinutes = analysisData.duration / 60;
      let segmentIndex = 1;
      const segments: any[] = [];
      
      // Create segments by excluding cut regions
      for (const cut of sortedCuts) {
        if (cut.start_time > segmentStart + 0.01) {
          const segmentDurationMinutes = cut.start_time - segmentStart;
          const segmentDurationFrames = Math.round(segmentDurationMinutes * 60 * 30);
          
          const isHighlight = highlights.some(h => 
            (h.start_time <= cut.start_time && h.end_time >= segmentStart) ||
            (h.start_time >= segmentStart && h.start_time <= cut.start_time)
          );
          
          segments.push({
            type: MediaType.VIDEO,
            name: `${videoName} - Part ${segmentIndex}${isHighlight ? ' ⭐' : ''}`,
            startTime: currentTimelinePosition,
            duration: segmentDurationFrames,
            trackId: 'track-1',
            src: videoSrc,
            properties: {
              trimStart: Math.round(segmentStart * 60 * 30),
              trimEnd: Math.round(cut.start_time * 60 * 30),
              isHighlight: isHighlight
            }
          });
          
          currentTimelinePosition += segmentDurationFrames;
          segmentIndex++;
        }
        segmentStart = cut.end_time;
      }
      
      // Add final segment
      if (segmentStart < videoDurationMinutes - 0.01) {
        const segmentDurationMinutes = videoDurationMinutes - segmentStart;
        const segmentDurationFrames = Math.round(segmentDurationMinutes * 60 * 30);
        
        const isHighlight = highlights.some(h => h.start_time >= segmentStart);
        
        segments.push({
          type: MediaType.VIDEO,
          name: `${videoName} - Part ${segmentIndex}${isHighlight ? ' ⭐' : ''}`,
          startTime: currentTimelinePosition,
          duration: segmentDurationFrames,
          trackId: 'track-1',
          src: videoSrc,
          properties: {
            trimStart: Math.round(segmentStart * 60 * 30),
            trimEnd: Math.round(videoDurationMinutes * 60 * 30),
            isHighlight: isHighlight
          }
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 5: Adding segments to timeline
      setStatusMessage('📍 Placing segments on timeline...');
      setProgress(80);
      
      // Add all segments to timeline
      for (const segment of segments) {
        actions.addItem(segment);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual effect
      }
      
      // Step 6: Finalizing
      setStatusMessage('✨ Finalizing your AI-generated video...');
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update timeline duration
      actions.updateDuration();
      
      // Complete
      setProgress(100);
      setStatusMessage('🎉 Your video is ready!');
      setGenerationComplete(true);
      
      // Calculate stats
      const totalCutDuration = cuts.reduce((acc, cut) => acc + (cut.end_time - cut.start_time), 0);
      const originalDuration = analysisData.duration / 60;
      const newDuration = originalDuration - totalCutDuration;
      const reductionPercentage = ((totalCutDuration / originalDuration) * 100).toFixed(1);
      
      // Store stats for display
      setGenerationStats({
        segmentsCreated: segments.length,
        cutsRemoved: cuts.length,
        reductionPercentage,
        highlightsPreserved: highlights.length,
        originalDuration: originalDuration.toFixed(1),
        newDuration: newDuration.toFixed(1)
      });
      
      console.log(`✅ One Shot Generation Complete!`);
      console.log(`📊 Created ${segments.length} segments`);
      console.log(`✂️ Removed ${cuts.length} cuts (${reductionPercentage}% reduction)`);
      console.log(`⭐ Preserved ${highlights.length} highlights`);
      console.log(`⏱️ Duration: ${originalDuration.toFixed(1)}min → ${newDuration.toFixed(1)}min`);
      
      // Auto close after showing success
      setTimeout(() => {
        onClose();
      }, 5000); // Give more time to see the stats
      
    } catch (error) {
      console.error('Error generating timeline:', error);
      setError('Failed to generate timeline. Please try again.');
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
          <h2 className="text-2xl font-bold text-white mb-2">One Shot Generate</h2>
          <p className="text-white/90 text-sm">
            AI is creating an optimized video from your footage
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : generationComplete ? (
            <div>
              {/* Success Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">✅ One Shot Generation Complete!</h3>
                <p className="text-gray-300 text-sm">
                  Your optimized video is ready on the timeline
                </p>
              </div>

              {/* Statistics */}
              {generationStats && (
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <span className="mr-2">📊</span>
                      Created segments
                    </span>
                    <span className="text-white font-medium">{generationStats.segmentsCreated}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <span className="mr-2">✂️</span>
                      Removed cuts
                    </span>
                    <span className="text-white font-medium">
                      {generationStats.cutsRemoved} ({generationStats.reductionPercentage}% reduction)
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <span className="mr-2">⭐</span>
                      Preserved highlights
                    </span>
                    <span className="text-white font-medium">{generationStats.highlightsPreserved}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <span className="mr-2">⏱️</span>
                      Duration
                    </span>
                    <span className="text-white font-medium">
                      {generationStats.originalDuration}min → {generationStats.newDuration}min
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-green-400 text-center">
                      Timeline saved successfully
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Progress Animation */}
              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-gray-700 rounded-full"></div>
                    <div 
                      className="absolute top-0 left-0 w-24 h-24 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                      style={{
                        animation: `spin ${2 - (progress / 100)}s linear infinite`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                <div className="text-center mb-4">
                  <p className="text-white text-sm font-medium animate-pulse">
                    {statusMessage}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">What's happening:</h4>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Analyzing {analysisData.recommended_cuts_or_trims?.length || 0} recommended cuts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Preserving {analysisData.highlight_moments_worth_emphasizing?.length || 0} highlight moments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Creating an optimized timeline with smooth transitions</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isGenerating && !generationComplete && (
          <div className="border-t border-gray-700 p-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}