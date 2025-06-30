"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTimeline } from './TimelineContext';

interface RenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface RenderState {
  step: 'config' | 'deploying' | 'rendering' | 'complete' | 'error';
  progress: number;
  message: string;
  renderId?: string;
  outputFile?: string;
  error?: string;
  deploymentInfo?: {
    siteId: string;
    functionName: string;
    bucketName: string;
  };
}

export function RenderModal({ isOpen, onClose, projectId }: RenderModalProps) {
  const { state } = useTimeline();
  const [renderState, setRenderState] = useState<RenderState>({
    step: 'config',
    progress: 0,
    message: 'Ready to render',
  });

  const [renderConfig, setRenderConfig] = useState({
    quality: 'medium' as 'low' | 'medium' | 'high',
    format: 'mp4' as 'mp4' | 'mov',
    composition: 'Timeline', // This matches the ID in Root.tsx
    renderType: 'local' as 'local' | 'lambda',
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRenderState({
        step: 'config',
        progress: 0,
        message: 'Ready to render',
      });
    }
  }, [isOpen]);

  // Poll render progress
  const pollProgress = useCallback(async (renderId: string, bucketName?: string) => {
    try {
      const url = bucketName 
        ? `/api/render/progress/${renderId}?bucket=${bucketName}`
        : `/api/render/progress/${renderId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRenderState(prev => ({
          ...prev,
          progress: Math.round(data.progress * 100),
          message: data.done 
            ? 'Render complete!' 
            : `Rendering... ${Math.round(data.progress * 100)}%`,
          step: data.done ? 'complete' : 'rendering',
          outputFile: data.outputFile,
        }));

        // Continue polling if not done
        if (!data.done) {
          setTimeout(() => pollProgress(renderId, bucketName), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to poll progress:', error);
      setRenderState(prev => ({
        ...prev,
        step: 'error',
        error: 'Failed to check render progress',
      }));
    }
  }, []);

  const startRender = useCallback(async () => {
    try {
      if (renderConfig.renderType === 'local') {
        // Local rendering
        setRenderState({
          step: 'rendering',
          progress: 20,
          message: 'Starting local render...',
        });

        const renderResponse = await fetch('/api/render/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            composition: renderConfig.composition,
            timelineState: state,
            outputFormat: renderConfig.format,
            quality: renderConfig.quality,
            projectId,
          }),
        });

        const renderData = await renderResponse.json();

        if (!renderData.success) {
          throw new Error(renderData.error);
        }

        setRenderState({
          step: 'complete',
          progress: 100,
          message: 'Render complete!',
          outputFile: renderData.outputFile,
        });

      } else {
        // Lambda rendering - requires AWS setup
        setRenderState({
          step: 'rendering',
          progress: 20,
          message: 'Starting cloud render...',
        });

        // For Lambda, you'll need to ensure you have:
        // 1. AWS credentials set up
        // 2. A pre-deployed Remotion site
        // 3. A pre-deployed Lambda function
        
        const renderResponse = await fetch('/api/render/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            composition: renderConfig.composition,
            timelineState: state,
            outputFormat: renderConfig.format,
            quality: renderConfig.quality,
            projectId,
            // userId can be added here if you have auth
          }),
        });

        const renderData = await renderResponse.json();

        if (!renderData.success) {
          throw new Error(renderData.error);
        }

        setRenderState(prev => ({
          ...prev,
          step: 'rendering',
          progress: 40,
          message: 'Render started, processing video...',
          renderId: renderData.renderId,
        }));

        // Poll progress for Lambda
        pollProgress(renderData.renderId, renderData.bucketName);
      }

    } catch (error) {
      console.error('Render failed:', error);
      setRenderState({
        step: 'error',
        progress: 0,
        message: 'Render failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [projectId, state, renderConfig, pollProgress]);

  const downloadVideo = useCallback(() => {
    if (renderState.outputFile) {
      // Create download link
      const link = document.createElement('a');
      link.href = renderState.outputFile;
      link.download = `timeline-${projectId}-${Date.now()}.${renderConfig.format}`;
      link.click();
    }
  }, [renderState.outputFile, projectId, renderConfig.format]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-lg font-semibold text-white">Render Video</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={renderState.step === 'deploying' || renderState.step === 'rendering'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Configuration Step */}
          {renderState.step === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Render Type
                </label>
                <select
                  value={renderConfig.renderType}
                  onChange={(e) => setRenderConfig(prev => ({ 
                    ...prev, 
                    renderType: e.target.value as any 
                  }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="local">Local (On your machine)</option>
                  <option value="lambda">Cloud (AWS Lambda - requires setup)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality
                </label>
                <select
                  value={renderConfig.quality}
                  onChange={(e) => setRenderConfig(prev => ({ 
                    ...prev, 
                    quality: e.target.value as any 
                  }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="low">Low (Fast, smaller file)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Slow, best quality)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Format
                </label>
                <select
                  value={renderConfig.format}
                  onChange={(e) => setRenderConfig(prev => ({ 
                    ...prev, 
                    format: e.target.value as any 
                  }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="mov">MOV (H.265)</option>
                </select>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{Math.round(state.totalDuration / state.fps)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Clips:</span>
                  <span>{state.tracks.reduce((sum, track) => sum + track.items.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transitions:</span>
                  <span>{state.tracks.reduce((sum, track) => sum + (track.transitions?.length || 0), 0)}</span>
                </div>
              </div>

              {renderConfig.renderType === 'lambda' && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-xs text-yellow-300">
                  <p className="font-semibold mb-1">AWS Lambda Setup Required:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>AWS credentials configured</li>
                    <li>Remotion site deployed</li>
                    <li>Lambda function deployed</li>
                  </ul>
                </div>
              )}

              <button
                onClick={startRender}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Start Render
              </button>
            </div>
          )}

          {/* Progress Steps */}
          {(renderState.step === 'deploying' || renderState.step === 'rendering') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span className="text-white">{renderState.message}</span>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${renderState.progress}%` }}
                ></div>
              </div>

              <div className="text-sm text-gray-400 text-center">
                {renderState.progress}%
              </div>
            </div>
          )}

          {/* Complete Step */}
          {renderState.step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Render Complete!</h3>
              <p className="text-gray-300">Your video has been successfully rendered.</p>
              
              <div className="space-y-2">
                <button
                  onClick={downloadVideo}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Download Video
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Error Step */}
          {renderState.step === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Render Failed</h3>
              <p className="text-gray-300">{renderState.error}</p>
              
              <div className="space-y-2">
                <button
                  onClick={() => setRenderState({ step: 'config', progress: 0, message: 'Ready to render' })}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}