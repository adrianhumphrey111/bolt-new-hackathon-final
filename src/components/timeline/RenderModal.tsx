"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTimeline } from './TimelineContext';
import { useAuthContext } from '../AuthProvider';
import { exportToDaVinciResolveXML, downloadXMLFile } from '../../lib/davinciResolveExport';

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
    compositionName: string;
    serveUrl: string;
    deploymentId: string;
  };
}

export function RenderModal({ isOpen, onClose, projectId }: RenderModalProps) {
  const { state } = useTimeline();
  const { session } = useAuthContext();
  const [renderState, setRenderState] = useState<RenderState>({
    step: 'config',
    progress: 0,
    message: 'Ready to render',
  });

  const [renderConfig] = useState({
    quality: 'ultra' as 'low' | 'medium' | 'high' | 'ultra',
    format: 'mp4' as 'mp4' | 'mov',
    composition: 'Timeline', // This matches the Timeline composition in Root.tsx
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
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const url = bucketName 
        ? `/api/render/progress/${renderId}?bucket=${bucketName}`
        : `/api/render/progress/${renderId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
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
  }, [session]);

  const startRender = useCallback(async () => {
    try {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // 🔍 DETAILED LOGGING - Timeline State Before Render
      console.log('🎬 RENDER MODAL - Starting render with state:', {
        totalDuration: state.totalDuration,
        fps: state.fps,
        tracksCount: state.tracks?.length || 0,
        playheadPosition: state.playheadPosition,
        zoom: state.zoom,
        selectedItems: state.selectedItems,
        isPlaying: state.isPlaying,
      });

      // Log each track and its items
      state.tracks?.forEach((track, index) => {
        console.log(`🎬 RENDER MODAL - Track ${index + 1} (${track.id}):`, {
          name: track.name,
          itemsCount: track.items?.length || 0,
          transitionsCount: track.transitions?.length || 0,
          items: track.items?.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            startTime: item.startTime,
            duration: item.duration,
            hasSrc: !!item.src,
            src: item.src ? item.src.substring(0, 50) + '...' : 'NO SRC',
          })) || [],
        });
      });

      console.log('🎬 RENDER MODAL - Full timeline state:', JSON.stringify(state, null, 2));

      // Step 1: Deploy composition with user's timeline data
      setRenderState({
        step: 'deploying',
        progress: 10,
        message: 'Deploying your timeline composition...',
      });

      const deployResponse = await fetch('/api/render/deploy-composition', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          timelineState: state,
          projectId,
        }),
      });

      const deployData = await deployResponse.json();

      if (!deployData.success) {
        throw new Error(deployData.error);
      }

      console.log('🎬 RENDER MODAL - Composition deployed:', deployData);

      setRenderState(prev => ({
        ...prev,
        progress: 30,
        message: 'Composition deployed, starting render...',
        deploymentInfo: {
          compositionName: deployData.compositionName,
          serveUrl: deployData.serveUrl,
          deploymentId: deployData.deploymentId,
        },
      }));

      // Step 2: Start Lambda rendering with the deployed composition
      setRenderState(prev => ({
        ...prev,
        step: 'rendering',
        progress: 40,
        message: 'Starting cloud render...',
      }));
      
      const renderResponse = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          composition: deployData.compositionName, // Use the deployed composition name
          serveUrl: deployData.serveUrl, // Use the deployed serve URL
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

      setRenderState(prev => ({
        ...prev,
        step: 'rendering',
        progress: 60,
        message: 'Render started, processing video...',
        renderId: renderData.renderId,
      }));

      // Poll progress for Lambda
      pollProgress(renderData.renderId, renderData.bucketName);

    } catch (error) {
      console.error('Render failed:', error);
      setRenderState({
        step: 'error',
        progress: 0,
        message: 'Render failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [projectId, state, renderConfig, pollProgress, session]);

  const downloadVideo = useCallback(() => {
    if (renderState.outputFile) {
      // Create download link
      const link = document.createElement('a');
      link.href = renderState.outputFile;
      link.download = `timeline-${projectId}-${Date.now()}.${renderConfig.format}`;
      link.click();
    }
  }, [renderState.outputFile, projectId, renderConfig.format]);

  const exportToDaVinciResolve = useCallback(() => {
    try {
      const projectName = `Timeline Export ${new Date().toISOString().split('T')[0]}`;
      const xmlContent = exportToDaVinciResolveXML(state, projectName);
      const filename = `timeline-${projectId}-${Date.now()}.fcpxml`;
      downloadXMLFile(xmlContent, filename);
    } catch (error) {
      console.error('Error exporting to DaVinci Resolve:', error);
      alert('Failed to export timeline. Please try again.');
    }
  }, [state, projectId]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
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
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Remotion Cloud Render</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Your video will be rendered using Remotion's cloud infrastructure for fast, high-quality output.
                </p>
                
                <div className="space-y-2 text-sm text-gray-300">
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
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span>Ultra (1080p)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>MP4</span>
                  </div>
                </div>
              </div>

              <button
                onClick={startRender}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Start Cloud Render
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={exportToDaVinciResolve}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  title="Export timeline as FCPXML for DaVinci Resolve"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Export to DaVinci</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
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
                  onClick={exportToDaVinciResolve}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  title="Export timeline as FCPXML for DaVinci Resolve"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Export to DaVinci Resolve</span>
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