"use client";

import React, { useRef, useState, useCallback } from 'react';
import { useTimeline } from './TimelineContext';

export function Playhead() {
  const { state, config, actions } = useTimeline();
  const { playheadPosition, zoom, totalDuration } = state;
  const { rulerHeight, trackHeight } = config;
  
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const pixelsPerFrame = zoom;
  const playheadX = playheadPosition * pixelsPerFrame;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const timeline = e.currentTarget as HTMLElement;
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset;
      const frame = Math.max(0, Math.min(Math.round(x / pixelsPerFrame), totalDuration));
      
      actions.setPlayheadPosition(frame);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dragOffset, pixelsPerFrame, totalDuration, actions]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) return;
    
    // Don't move playhead if clicking on a timeline item
    const target = e.target as HTMLElement;
    if (target.closest('[data-item-id]')) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.min(Math.round(x / pixelsPerFrame), totalDuration));
    
    actions.setPlayheadPosition(frame);
  }, [pixelsPerFrame, totalDuration, actions]);

  const tracksHeight = state.tracks.length * trackHeight;

  return (
    <>
      {/* Clickable timeline area */}
      <div
        className="absolute inset-0 cursor-pointer"
        onMouseDown={handleTimelineClick}
        style={{ 
          top: rulerHeight,
          height: tracksHeight,
        }}
      />
      
      {/* Playhead line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
        style={{ 
          left: playheadX,
          height: rulerHeight + tracksHeight,
        }}
      />
      
      {/* Playhead handle */}
      <div
        className="absolute w-4 h-4 bg-red-500 rounded-sm cursor-grab active:cursor-grabbing border border-red-600 z-20"
        style={{ 
          left: playheadX - 8,
          top: rulerHeight - 8,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Triangle indicator */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-3 border-transparent border-t-red-500" />
      </div>
    </>
  );
}