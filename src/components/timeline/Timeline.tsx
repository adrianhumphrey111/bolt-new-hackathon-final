"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { TimelineRuler } from './TimelineRuler';
import { Track } from './Track';
// import { Playhead } from './Playhead'; // Temporarily disabled for drag testing
import { usePlayerControls } from '../VideoEditor';

export function Timeline() {
  const { state, config, actions } = useTimeline();
  const { tracks, zoom, totalDuration, isPlaying, playheadPosition, fps } = state;
  const { rulerHeight, trackHeight } = config;
  const { handlePlayPause } = usePlayerControls();
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const pixelsPerFrame = zoom;
  const totalWidth = totalDuration * pixelsPerFrame;
  const totalHeight = rulerHeight + (tracks.length * trackHeight);

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (isPlaying && scrollRef.current) {
      const playheadX = playheadPosition * pixelsPerFrame;
      const containerWidth = scrollRef.current.clientWidth;
      const scrollLeft = scrollRef.current.scrollLeft;
      const scrollRight = scrollLeft + containerWidth;
      
      // Auto-scroll if playhead is near edges
      if (playheadX > scrollRight - 100) {
        scrollRef.current.scrollLeft = playheadX - containerWidth + 200;
      } else if (playheadX < scrollLeft + 100) {
        scrollRef.current.scrollLeft = Math.max(0, playheadX - 200);
      }
    }
  }, [playheadPosition, pixelsPerFrame, isPlaying]);

  // Note: Playback animation is now handled by the Remotion player
  // The timeline just syncs with the player's frame updates

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    actions.setZoom(Math.min(zoom * 1.5, config.maxZoom));
  }, [zoom, actions, config.maxZoom]);

  const handleZoomOut = useCallback(() => {
    actions.setZoom(Math.max(zoom / 1.5, config.minZoom));
  }, [zoom, actions, config.minZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts in input fields
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.setPlayheadPosition(Math.max(0, playheadPosition - (e.shiftKey ? fps : 1)));
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.setPlayheadPosition(Math.min(totalDuration, playheadPosition + (e.shiftKey ? fps : 1)));
          break;
        case 'Home':
          e.preventDefault();
          actions.setPlayheadPosition(0);
          break;
        case 'End':
          e.preventDefault();
          actions.setPlayheadPosition(totalDuration);
          break;
        case 'Equal':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case 'Minus':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playheadPosition, fps, totalDuration, actions, handleZoomIn, handleZoomOut]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(config.minZoom, Math.min(config.maxZoom, zoom + delta));
      actions.setZoom(newZoom);
    }
  }, [zoom, actions, config]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-600">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-600">
        <div className="flex items-center space-x-4">
          {/* Playback controls */}
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-10 h-10 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Time display */}
          <div className="text-sm text-gray-300 font-mono">
            {Math.floor(playheadPosition / fps / 60)}:
            {Math.floor((playheadPosition / fps) % 60).toString().padStart(2, '0')}:
            {Math.floor(playheadPosition % fps).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <span className="text-sm text-gray-300 min-w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Add track button */}
          <button
            onClick={actions.addTrack}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
          >
            Add Track
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onWheel={handleWheel}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ 
            width: totalWidth,
            minWidth: '100%',
            height: totalHeight,
          }}
          data-timeline-container
        >
          {/* Ruler */}
          <div className="sticky top-0 z-20">
            <TimelineRuler />
          </div>

          {/* Tracks */}
          <div className="relative">
            {tracks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <p className="mb-2">No tracks yet</p>
                  <button
                    onClick={actions.addTrack}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Add Your First Track
                  </button>
                </div>
              </div>
            ) : (
              tracks.map((track, index) => (
                <Track key={track.id} track={track} index={index} />
              ))
            )}
          </div>

          {/* Playhead - Temporarily disabled for drag testing */}
          {/* <Playhead /> */}
        </div>
      </div>
    </div>
  );
}