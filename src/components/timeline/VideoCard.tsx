"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MediaType } from '../../../types/timeline';
import { createClientSupabaseClient } from '../../lib/supabase/client';

interface VideoAnalysis {
  id: string;
  video_id: string;
  status: string;
  is_converting?: boolean;
  created_at?: string;
}

interface Video {
  id: string;
  original_name: string;
  file_path: string;
  file_name?: string;
  duration?: number;
  thumbnail_url?: string;
  created_at: string;
  video_analysis?: VideoAnalysis[];
}

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  src?: string;
  duration?: number; // in frames
  thumbnail?: string;
  file_path?: string;
  file_name?: string;
  original_name?: string;
  isAnalyzing?: boolean;
  processingInfo?: {
    video: Video;
    analysis?: VideoAnalysis;
    startTime: Date;
    elapsedSeconds: number;
    // Enhanced progress data
    step?: string;
    progress?: number;
    message?: string;
    timestamp?: number;
  };
}

interface VideoCardProps {
  video: MediaItem;
  fps: number;
  isConverting?: boolean;
  conversionProgress?: number;
  onDragStart: (e: React.DragEvent, mediaItem: MediaItem) => void;
  onAddToTimeline: (mediaItem: MediaItem) => void;
  onCleanUpClick: (videoId: string, videoName: string, videoDuration: number) => void;
  onAnalysisClick: (videoId: string, videoName: string, videoSrc?: string) => void;
  onDeleteClick: (e: React.MouseEvent, videoId: string, s3Key: string, videoName: string) => void;
  isDeleting?: boolean;
  isProjectVideo?: boolean;
  isReanalyzing?: boolean;
}

export function VideoCard({
  video: initialVideo,
  fps,
  isConverting = false,
  conversionProgress = 0,
  onDragStart,
  onAddToTimeline,
  onCleanUpClick,
  onAnalysisClick,
  onDeleteClick,
  isDeleting = false,
  isProjectVideo = false,
  isReanalyzing = false,
}: VideoCardProps) {
  const [video, setVideo] = useState<MediaItem>(initialVideo);
  const supabase = createClientSupabaseClient();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Format elapsed time
  const formatElapsedTime = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  // Convert technical step names to user-friendly names
  const getStepDisplayName = useCallback((step?: string): string => {
    const stepNames: Record<string, string> = {
      'starting': 'Initializing',
      'data_collection': 'Collecting Data',
      'script_analysis': 'Analyzing Content',
      'enhancement': 'Enhancing Analysis',
      'formatting': 'Finalizing Results',
      'completed': 'Completed',
      'transcript_saved': 'Processing Audio',
      'uploading': 'Uploading',
      'transferring': 'Transferring',
      'transfer_complete': 'Transfer Complete',
      'waiting_for_analysis': 'Preparing Analysis',
      'processing': 'Processing',
      'analyzing': 'Analyzing'
    };
    return stepNames[step || ''] || 'Processing';
  }, []);

  // Fetch video analysis status
  const fetchAnalysisStatus = useCallback(async () => {
    if (!video.isAnalyzing || !video.id) return;

    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          video_analysis!video_analysis_video_id_fkey (*)
        `)
        .eq('id', video.id)
        .single();

      if (error) {
        console.error('Error fetching video analysis status:', error);
        return;
      }

      if (data) {
        // Get the most recent analysis record
        const analysis = data.video_analysis?.sort((a: VideoAnalysis, b: VideoAnalysis) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        )[0];
        
        const isAnalyzing = !analysis || 
          analysis.status === 'processing' || 
          analysis.status === 'pending' ||
          analysis.status === 'queued' ||
          analysis.is_converting;

        // Update processing info
        const processingInfo = isAnalyzing ? {
          video: data,
          analysis: analysis,
          startTime: new Date(data.created_at),
          elapsedSeconds: Math.floor((new Date().getTime() - new Date(data.created_at).getTime()) / 1000)
        } : null;

        // Update video state
        setVideo(prev => ({
          ...prev,
          isAnalyzing,
          processingInfo,
          duration: data.duration ? Math.round(data.duration * fps) : prev.duration,
          thumbnail: data.thumbnail_url || prev.thumbnail,
        }));

        // If analysis is complete, stop polling
        if (!isAnalyzing) {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching video analysis status:', error);
    }
  }, [video.isAnalyzing, video.id, supabase, fps]);

  // Start polling when video is analyzing
  useEffect(() => {
    if (video.isAnalyzing && !pollingInterval.current) {
      // Initial fetch
      fetchAnalysisStatus();
      
      // Set up polling every 5 seconds
      const interval = setInterval(() => {
        fetchAnalysisStatus();
      }, 5000);
      
      pollingInterval.current = interval;
    }

    // Cleanup on unmount or when video stops analyzing
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [video.isAnalyzing, fetchAnalysisStatus]);

  // Update video when prop changes
  useEffect(() => {
    setVideo(initialVideo);
  }, [initialVideo]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Check if the click came from a button or interactive element
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // Let the button handle its own click
    }
    
    if (video.type === MediaType.VIDEO && isProjectVideo) {
      if (video.isAnalyzing) {
        setShowAnalysisModal(true);
        return;
      }
      onAnalysisClick(video.id, video.name, video.src);
    } else {
      onAddToTimeline(video);
    }
  }, [video, isProjectVideo, onAnalysisClick, onAddToTimeline]);

  return (
    <div
      className="group bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 w-full"
      draggable={!isConverting && !video.isAnalyzing}
      onDragStart={(e) => (!isConverting && !video.isAnalyzing) && onDragStart(e, video)}
      onClick={handleClick}
    >
      {/* Video thumbnail */}
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
        {/* Video icon */}
        <div className="text-gray-500">
          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </div>

        {/* Duration badge */}
        {video.duration && !video.isAnalyzing && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {Math.round(video.duration / fps * 10) / 10}s
          </div>
        )}

        {/* Enhanced Status indicator */}
        {(isConverting || video.isAnalyzing) && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
            <div className="text-center px-4 py-3 max-w-full">
              <svg className="w-8 h-8 animate-spin text-white mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              
              {/* Step name and progress percentage */}
              <div className="text-white text-sm font-semibold mb-2">
                {isConverting ? 'Converting' : getStepDisplayName(video.processingInfo?.step)}
                {video.processingInfo?.progress !== undefined && (
                  <span className="ml-2 text-blue-300">
                    {Math.round(video.processingInfo.progress)}%
                  </span>
                )}
              </div>
              
              {/* Progress bar */}
              {video.processingInfo?.progress !== undefined && !isConverting && (
                <div className="w-32 h-1.5 bg-gray-600 rounded-full mb-2 mx-auto">
                  <div 
                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${video.processingInfo.progress}%` }}
                  />
                </div>
              )}
              
              {/* Step message */}
              {video.processingInfo?.message && !isConverting && (
                <div className="text-gray-300 text-xs mb-2 max-w-40 truncate">
                  {video.processingInfo.message}
                </div>
              )}
              
              {/* Elapsed time */}
              {video.isAnalyzing && video.processingInfo && (
                <div className="text-gray-400 text-xs">
                  {formatElapsedTime(video.processingInfo.elapsedSeconds)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress bar for conversion */}
        {isConverting && conversionProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div 
              className="h-full bg-blue-400 transition-all duration-300"
              style={{ width: `${conversionProgress}%` }}
            />
          </div>
        )}

        {/* Hover actions - only show for ready videos */}
        {!isConverting && !video.isAnalyzing && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTimeline(video);
                }}
                className="p-1.5 bg-black/80 text-white rounded-full hover:bg-black transition-colors"
                title="Add to timeline"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isProjectVideo && (
                <button
                  onClick={(e) => onDeleteClick(e, video.id, video.file_path || '', video.name)}
                  disabled={isDeleting}
                  className="p-1.5 bg-black/80 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                  title="Delete video"
                >
                  {isDeleting ? (
                    <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Video info and actions */}
      <div className="p-4">
        {/* Video name */}
        <h3 className="text-white font-medium text-base truncate mb-3" title={video.name}>
          {video.name.replace(/\.[^/.]+$/, "")}
        </h3>
        
        {/* Primary action - only show for ready videos */}
        {isProjectVideo && !isConverting && !video.isAnalyzing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCleanUpClick(video.id, video.name, video.duration || 0);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-2.27-1.16-2.65 0a1.51 1.51 0 01-2.61-.33 2.5 2.5 0 00-3.4 3.4c.04.1.09.2.16.3a1.51 1.51 0 01-.33 2.61c-1.16.38-1.16 2.27 0 2.65.1.04.2.09.33.16a1.51 1.51 0 01.33 2.61 2.5 2.5 0 003.4 3.4c.1-.04.2-.09.3-.16a1.51 1.51 0 012.61.33c.38 1.16 2.27 1.16 2.65 0a1.51 1.51 0 012.61.33 2.5 2.5 0 003.4-3.4 1.51 1.51 0 01.16-.3 1.51 1.51 0 01.33-2.61c1.16-.38 1.16-2.27 0-2.65a1.51 1.51 0 01-.33-2.61 2.5 2.5 0 00-3.4-3.4 1.51 1.51 0 01-.3-.16 1.51 1.51 0 01-2.61-.33z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Clean Up
          </button>
        )}

        {/* Secondary action - View Analysis */}
        {isProjectVideo && !isConverting && !video.isAnalyzing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnalysisClick(video.id, video.name, video.src);
            }}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            View Analysis
          </button>
        )}
      </div>

      {/* Enhanced Analysis Progress Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAnalysisModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 m-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              {/* Header */}
              <div className="mb-4">
                <svg className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2">Video Analysis in Progress</h3>
                <p className="text-gray-400 text-sm">{video.name}</p>
              </div>

              {/* Progress Information */}
              <div className="mb-6">
                {/* Current Step */}
                <div className="text-white text-base font-medium mb-3">
                  {getStepDisplayName(video.processingInfo?.step)}
                  {video.processingInfo?.progress !== undefined && (
                    <span className="ml-2 text-blue-300 text-sm">
                      {Math.round(video.processingInfo.progress)}%
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {video.processingInfo?.progress !== undefined && (
                  <div className="w-full h-2 bg-gray-600 rounded-full mb-3">
                    <div 
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${video.processingInfo.progress}%` }}
                    />
                  </div>
                )}

                {/* Step Message */}
                {video.processingInfo?.message && (
                  <p className="text-gray-300 text-sm mb-3">
                    {video.processingInfo.message}
                  </p>
                )}

                {/* Elapsed Time */}
                {video.processingInfo && (
                  <div className="text-gray-400 text-sm">
                    Elapsed time: {formatElapsedTime(video.processingInfo.elapsedSeconds)}
                  </div>
                )}

                {/* Estimated completion */}
                {video.processingInfo?.progress !== undefined && video.processingInfo.progress > 0 && (
                  <div className="text-gray-400 text-xs mt-2">
                    {video.processingInfo.progress >= 90 ? 'Almost done!' : 
                     video.processingInfo.progress >= 70 ? 'Nearly finished...' :
                     video.processingInfo.progress >= 40 ? 'More than halfway there!' :
                     'Processing your video...'}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                OK
              </button>

              <p className="text-gray-500 text-xs mt-3">
                Please check back in a few moments. The analysis will appear automatically when complete.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}