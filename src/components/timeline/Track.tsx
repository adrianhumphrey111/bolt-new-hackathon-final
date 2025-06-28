"use client";

import React from 'react';
import { Track as TrackType } from '../../../types/timeline';
import { useTimeline } from './TimelineContext';
import { TimelineItemComponent } from './TimelineItemComponent';

interface TrackProps {
  track: TrackType;
  index: number;
}

export function Track({ track, index }: TrackProps) {
  const { state, config, actions } = useTimeline();
  const { zoom, totalDuration } = state;
  const { trackHeight } = config;
  
  const pixelsPerFrame = zoom;
  const totalWidth = totalDuration * pixelsPerFrame;

  const handleTrackClick = (e: React.MouseEvent) => {
    // Deselect items when clicking empty track area
    if (e.target === e.currentTarget) {
      actions.selectItems([]);
    }
  };

  const handleTrackRightClick = (e: React.MouseEvent) => {
    // Only handle right-click on empty track areas (not on timeline items)
    if (e.target === e.currentTarget) {
      e.preventDefault();
      console.log('🖱️ Right-clicking empty track area');
      // Could add track-specific context menu here later
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Handle media library drop
    try {
      const data = e.dataTransfer.getData('application/json');
      const dropData = JSON.parse(data);
      
      if (dropData.type === 'media-item') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - 128; // Account for track header width
        const frame = Math.max(0, Math.round(x / (state.zoom)));
        
        actions.addItem({
          type: dropData.item.type,
          name: dropData.item.name,
          startTime: frame,
          duration: dropData.item.duration || 90,
          trackId: track.id,
          src: dropData.item.src,
          content: dropData.item.content,
        });
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`
        relative border-b border-gray-600 transition-all duration-200
        ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}
        hover:bg-gray-700
      `}
      style={{ 
        height: trackHeight,
        width: totalWidth,
        minWidth: '100%'
      }}
      data-track-id={track.id}
      onClick={handleTrackClick}
      onContextMenu={handleTrackRightClick}
      onDrop={handleTrackDrop}
      onDragOver={handleTrackDragOver}
    >
      {/* Track header (could be moved to separate component) */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gray-700 border-r border-gray-600 flex items-center px-3 z-10">
        <div className="flex-1">
          <div className="text-sm text-white font-medium truncate">
            {track.name}
          </div>
          <div className="text-xs text-gray-400">
            {track.items.length} item{track.items.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Track controls */}
        <div className="flex items-center space-x-1">
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-white"
            onClick={() => actions.removeTrack(track.id)}
            title="Delete track"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {track.muted && (
            <div className="w-4 h-4 text-red-400" title="Muted">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.792L5.5 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.5l2.883-2.792zM15.293 7.293a1 1 0 011.414 0L18 8.586l1.293-1.293a1 1 0 111.414 1.414L19.414 10l1.293 1.293a1 1 0 01-1.414 1.414L18 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L16.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Track content area */}
      <div className="relative ml-32 h-full">
        {/* Grid lines for visual reference */}
        {Array.from({ length: Math.ceil(totalDuration / state.fps) }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-600 opacity-30"
            style={{ left: i * state.fps * pixelsPerFrame }}
          />
        ))}
        
        {/* Timeline items */}
        {track.items.map(item => (
          <TimelineItemComponent
            key={item.id}
            item={item}
            trackHeight={trackHeight}
          />
        ))}
      </div>
    </div>
  );
}