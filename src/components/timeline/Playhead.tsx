"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useTimeline } from './TimelineContext';

export function Playhead() {
  const { state, config, actions } = useTimeline();
  const { playheadPosition, zoom, totalDuration, tracks, isPlaying } = state;
  const { rulerHeight, trackHeight } = config;
  const [isManualSeeking, setIsManualSeeking] = useState(false);

  const pixelsPerFrame = zoom;
  const trackHeaderWidth = 128; // Same as track header width (w-32)
  const playheadX = playheadPosition * pixelsPerFrame + trackHeaderWidth; // Offset by header width
  
  // Debug playhead position changes (remove in production)
  // React.useEffect(() => {
  //   console.log('🔴 Playhead visual update - frame:', playheadPosition, 'x:', playheadX + 'px');
  // }, [playheadPosition, playheadX]);
  
  // Calculate total height: ruler + gap + all tracks
  const gapHeight = 8; // Gap between ruler and tracks
  const totalTracksHeight = tracks.length * trackHeight;
  const totalHeight = rulerHeight + gapHeight + totalTracksHeight;

  // Handle ruler click to move playhead
  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsManualSeeking(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - trackHeaderWidth; // Account for header offset
    const frame = Math.max(0, Math.min(Math.round(x / pixelsPerFrame), totalDuration));
    
    console.log('🎯 Ruler clicked - moving playhead to frame:', frame);
    actions.setPlayheadPosition(frame);
    
    // Reset after a brief delay
    setTimeout(() => setIsManualSeeking(false), 150);
  }, [pixelsPerFrame, totalDuration, actions, trackHeaderWidth]);

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎬 Starting playhead drag');
    setIsManualSeeking(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const timelineContainer = document.querySelector('[data-timeline-container]') as HTMLElement;
      if (!timelineContainer) return;
      
      const rect = timelineContainer.getBoundingClientRect();
      const x = e.clientX - rect.left - trackHeaderWidth; // Account for header offset
      const frame = Math.max(0, Math.min(Math.round(x / pixelsPerFrame), totalDuration));
      
      actions.setPlayheadPosition(frame);
    };

    const handleMouseUp = () => {
      console.log('🎬 Playhead drag ended');
      setIsManualSeeking(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pixelsPerFrame, totalDuration, actions]);

  return (
    <>
      {/* Ruler click area - only responds to ruler clicks */}
      <div
        className="absolute top-0 cursor-pointer z-10"
        style={{ 
          height: rulerHeight,
          left: trackHeaderWidth,
          right: 0
        }}
        onClick={handleRulerClick}
        data-ruler-click-area
      />
      
      {/* Playhead visual */}
      <div 
        className={`absolute top-0 pointer-events-none z-30 ${
          !isManualSeeking && isPlaying ? 'transition-all duration-100 ease-linear' : ''
        }`}
        style={{ 
          left: playheadX,
          transform: 'translateX(-1px)', // Center the 2px line
        }}
      >
        {/* Playhead line spanning ruler + gap + tracks */}
        <div 
          className="w-0.5 bg-red-500 shadow-lg"
          style={{ height: totalHeight }}
        />
        
        {/* Playhead handle at top of ruler */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-auto cursor-grab active:cursor-grabbing"
          style={{ marginTop: '-2px' }}
          onMouseDown={handlePlayheadMouseDown}
        >
          {/* CapCut-style playhead handle */}
          <div className="relative">
            {/* Main handle body */}
            <div className="w-5 h-7 bg-red-500 rounded-b-md shadow-lg border border-red-600 flex items-end justify-center">
              {/* Handle grip */}
              <div className="w-1.5 h-1.5 bg-red-700 rounded-full mb-1" />
            </div>
            
            {/* Top indicator triangle */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[4px] border-transparent border-b-red-500" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}