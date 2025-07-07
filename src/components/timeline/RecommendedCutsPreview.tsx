"use client";

import React, { useState } from 'react';
import { useTimeline } from './TimelineContext';
import { MediaType } from '../../../types/timeline';

interface RecommendedCut {
  id?: string;
  start_time?: number;  // in minutes (legacy format)
  end_time?: number;    // in minutes (legacy format)
  startTime?: number;   // in seconds (new format)
  endTime?: number;     // in seconds (new format)
  type?: 'silence' | 'filler_word' | 'specific_content' | 'unwanted_content' | 'quality_issue' | 'off_topic';
  reason: string;
  transcript?: string;
  confidence?: number;
  priority?: 'high' | 'medium' | 'low';
  videoId: string;
  videoName: string;
}

interface RecommendedCutsPreviewProps {
  cuts: RecommendedCut[];
  onCutApplied?: (cut: RecommendedCut) => void;
}

interface AppliedCut {
  cutId: string;
  itemId: string;
  originalStartTime: number;
  originalDuration: number;
  cutStartTime: number;
  cutEndTime: number;
}

const priorityColors = {
  high: 'bg-red-600',
  medium: 'bg-yellow-600', 
  low: 'bg-gray-600',
};

const priorityIcons = {
  high: '🔥',
  medium: '⚠️',
  low: '💡',
};

export function RecommendedCutsPreview({ cuts, onCutApplied }: RecommendedCutsPreviewProps) {
  const { state, actions } = useTimeline();
  const [appliedCuts, setAppliedCuts] = useState<AppliedCut[]>([]);

  const formatTime = (cut: RecommendedCut, isStart: boolean) => {
    // Handle both formats: new format uses seconds, legacy uses minutes
    const seconds = cut.startTime !== undefined && cut.endTime !== undefined
      ? (isStart ? cut.startTime : cut.endTime) // New format in seconds
      : cut.start_time !== undefined && cut.end_time !== undefined
        ? (isStart ? cut.start_time : cut.end_time) * 60 // Legacy format in minutes
        : 0;
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if a video is on the timeline
  const isVideoOnTimeline = (videoId: string) => {
    return state.tracks.some(track =>
      track.items.some(item => 
        item.type === MediaType.VIDEO && 
        (item.videoId === videoId || item.properties?.videoId === videoId)
      )
    );
  };

  // Find timeline items for a specific video
  const getTimelineItemsForVideo = (videoId: string) => {
    return state.tracks.flatMap(track =>
      track.items.filter(item => 
        item.type === MediaType.VIDEO && 
        (item.videoId === videoId || item.properties?.videoId === videoId)
      )
    );
  };

  // Apply a cut to timeline items
  const applyCut = (cut: RecommendedCut) => {
    const timelineItems = getTimelineItemsForVideo(cut.videoId);
    
    if (timelineItems.length === 0) {
      // Show error message - video not on timeline
      return;
    }

    // Handle both formats: new format uses seconds, legacy uses minutes
    const cutStartSeconds = cut.startTime !== undefined ? cut.startTime : (cut.start_time || 0) * 60;
    const cutEndSeconds = cut.endTime !== undefined ? cut.endTime : (cut.end_time || 0) * 60;
    const cutDurationSeconds = cutEndSeconds - cutStartSeconds;

    timelineItems.forEach(item => {
      // Check if the cut overlaps with this timeline item
      const itemStartSeconds = (item.properties?.originalStartTime || item.properties?.trim_start || 0);
      const itemEndSeconds = (item.properties?.originalEndTime || item.properties?.trim_end || item.duration / 30);
      
      // Check if cut is within this item's timerange
      if (cutStartSeconds >= itemStartSeconds && cutEndSeconds <= itemEndSeconds) {
        // Calculate new duration after removing the cut
        const newDurationSeconds = (itemEndSeconds - itemStartSeconds) - cutDurationSeconds;
        const newDurationFrames = Math.round(newDurationSeconds * 30);

        // Store the applied cut for undo functionality
        const cutId = cut.id || `${cut.videoId}-${cutStartSeconds}-${cutEndSeconds}`;
        const appliedCut: AppliedCut = {
          cutId: cutId,
          itemId: item.id,
          originalStartTime: item.startTime,
          originalDuration: item.duration,
          cutStartTime: cutStartSeconds,
          cutEndTime: cutEndSeconds
        };

        setAppliedCuts(prev => [...prev, appliedCut]);

        // Update the timeline item with new properties indicating the cut
        actions.updateItem(item.id, {
          duration: newDurationFrames,
          properties: {
            ...item.properties,
            appliedCuts: [...(item.properties?.appliedCuts || []), {
              start: cutStartSeconds,
              end: cutEndSeconds,
              reason: cut.reason
            }]
          }
        });

        onCutApplied?.(cut);
      }
    });
  };

  // Undo a cut
  const undoCut = (cutId: string) => {
    const appliedCut = appliedCuts.find(cut => cut.cutId === cutId);
    if (!appliedCut) return;

    // Restore original timeline item properties
    actions.updateItem(appliedCut.itemId, {
      startTime: appliedCut.originalStartTime,
      duration: appliedCut.originalDuration,
      properties: {
        appliedCuts: undefined // Remove the cuts property
      }
    });

    // Remove from applied cuts list
    setAppliedCuts(prev => prev.filter(cut => cut.cutId !== cutId));
  };

  // Check if a cut has been applied
  const isCutApplied = (cut: RecommendedCut) => {
    const cutStartSeconds = cut.startTime !== undefined ? cut.startTime : (cut.start_time || 0) * 60;
    const cutEndSeconds = cut.endTime !== undefined ? cut.endTime : (cut.end_time || 0) * 60;
    const cutId = cut.id || `${cut.videoId}-${cutStartSeconds}-${cutEndSeconds}`;
    return appliedCuts.some(appliedCut => appliedCut.cutId === cutId);
  };

  if (!cuts || cuts.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-gray-400 mb-2">
        ✂️ Found {cuts.length} recommended cut{cuts.length > 1 ? 's' : ''}:
      </div>
      
      {cuts.map((cut, index) => {
        const videoOnTimeline = isVideoOnTimeline(cut.videoId);
        const cutApplied = isCutApplied(cut);
        const cutStartSeconds = cut.startTime !== undefined ? cut.startTime : (cut.start_time || 0) * 60;
        const cutEndSeconds = cut.endTime !== undefined ? cut.endTime : (cut.end_time || 0) * 60;
        const cutId = cut.id || `${cut.videoId}-${cutStartSeconds}-${cutEndSeconds}`;
        const cutDuration = Math.round(cutEndSeconds - cutStartSeconds);
        const cutPriority = cut.priority || 'medium';
        
        return (
          <div
            key={index}
            className={`rounded-lg p-3 border transition-colors ${
              cutApplied 
                ? 'bg-green-900/20 border-green-600/30'
                : 'bg-gray-800 border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{priorityIcons[cutPriority]}</span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {formatTime(cut, true)} - {formatTime(cut, false)}
                  </div>
                  <div className={`inline-block px-2 py-1 rounded text-xs text-white ${priorityColors[cutPriority]}`}>
                    {cutPriority} priority
                  </div>
                  {cut.type && (
                    <div className="inline-block px-2 py-1 rounded text-xs bg-blue-600 text-white ml-1">
                      {cut.type.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>{cut.videoName}</div>
                <div className="text-red-400">
                  -{cutDuration}s saved
                </div>
                {cut.confidence && (
                  <div className="text-blue-400">
                    {Math.round(cut.confidence * 100)}% confidence
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-300 mb-3">
              <span className="font-medium">Why remove:</span> {cut.reason}
            </div>
            
            {!videoOnTimeline && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded p-2 mb-3">
                <div className="text-xs text-yellow-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Video needs to be added to timeline first
                </div>
              </div>
            )}
            
            {cut.transcript && (
              <div className="text-sm text-gray-300 mb-3 p-2 bg-gray-900 rounded">
                <span className="font-medium">Text:</span> "{cut.transcript}"
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Duration: {cutDuration}s
              </div>
              
              <div className="flex items-center space-x-2">
                {cutApplied ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Applied
                    </span>
                    <button
                      onClick={() => undoCut(cutId)}
                      className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => applyCut(cut)}
                    disabled={!videoOnTimeline}
                    className={`flex items-center space-x-1 px-3 py-2 rounded text-sm transition-colors ${
                      videoOnTimeline
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span>Apply Cut</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}