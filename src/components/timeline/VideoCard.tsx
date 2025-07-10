"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
}: VideoCardProps) {
  const [video, setVideo] = useState<MediaItem>(initialVideo);
  const supabase = createClientSupabaseClient();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Format elapsed time
  const formatElapsedTime = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching video analysis status:', error);
    }
  }, [video.isAnalyzing, video.id, supabase, fps, pollingInterval]);

  // Start polling when video is analyzing
  useEffect(() => {
    if (video.isAnalyzing && !pollingInterval) {
      // Initial fetch
      fetchAnalysisStatus();
      
      // Set up polling every 3 seconds
      const interval = setInterval(() => {
        fetchAnalysisStatus();
      }, 5000);
      
      setPollingInterval(interval);
    }

    // Cleanup on unmount or when video stops analyzing
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [video.isAnalyzing, fetchAnalysisStatus]);

  // Update video when prop changes
  useEffect(() => {
    setVideo(initialVideo);
  }, [initialVideo]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (video.type === MediaType.VIDEO && isProjectVideo) {
      if (video.isAnalyzing) {
        alert('This video is currently being analyzed. Please check back in a few moments to view the AI analysis.');
        return;
      }
      onAnalysisClick(video.id, video.name, video.src);
    } else {
      onAddToTimeline(video);
    }
  }, [video, isProjectVideo, onAnalysisClick, onAddToTimeline]);

  return (
    <div
      className="group bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
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

        {/* Status indicator */}
        {(isConverting || video.isAnalyzing) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 animate-spin text-white mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <div className="text-white text-sm font-medium">
                {isConverting ? 'Converting' : 'Analyzing'}
              </div>
              {video.isAnalyzing && video.processingInfo && (
                <div className="text-gray-300 text-xs">
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
      <div className="p-3">
        {/* Video name */}
        <h3 className="text-white font-medium text-sm truncate mb-2.5" title={video.name}>
          {video.name.replace(/\.[^/.]+$/, "")}
        </h3>
        
        {/* Primary action - only show for ready videos */}
        {isProjectVideo && !isConverting && !video.isAnalyzing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCleanUpClick(video.id, video.name, video.duration || 0);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-2.27-1.16-2.65 0a1.51 1.51 0 01-2.61-.33 2.5 2.5 0 00-3.4 3.4c.04.1.09.2.16.3a1.51 1.51 0 01-.33 2.61c-1.16.38-1.16 2.27 0 2.65.1.04.2.09.33.16a1.51 1.51 0 01.33 2.61 2.5 2.5 0 003.4 3.4c.1-.04.2-.09.3-.16a1.51 1.51 0 012.61.33c.38 1.16 2.27 1.16 2.65 0a1.51 1.51 0 012.61.33 2.5 2.5 0 003.4-3.4 1.51 1.51 0 01.16-.3 1.51 1.51 0 01.33-2.61c1.16-.38 1.16-2.27 0-2.65a1.51 1.51 0 01-.33-2.61 2.5 2.5 0 00-3.4-3.4 1.51 1.51 0 01-.3-.16 1.51 1.51 0 01-2.61-.33z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Clean Up
          </button>
        )}

        {/* Secondary actions - show on clean state */}
        {isProjectVideo && !isConverting && !video.isAnalyzing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnalysisClick(video.id, video.name, video.src);
            }}
            className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 px-3 rounded-md transition-colors"
          >
            Analysis
          </button>
        )}
      </div>
    </div>
  );
}