"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { TimelineRuler } from './TimelineRuler';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { usePlayerControls } from '../VideoEditor';
import { TimeDisplay, formatTime } from './TimeDisplay';
import { MediaType } from '../../../types/timeline';

export function Timeline() {
  const { state, config, actions, persistence } = useTimeline();
  const { tracks, zoom, totalDuration, isPlaying, playheadPosition, fps } = state;
  const { rulerHeight, trackHeight } = config;
  const { handlePlayPause, playerRef } = usePlayerControls();
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const pixelsPerFrame = zoom;
  const trackHeaderWidth = 128; // Track header width (w-32)
  const totalWidth = totalDuration * pixelsPerFrame + trackHeaderWidth; // Include header width
  const gapHeight = 8; // Gap between ruler and tracks
  const totalHeight = rulerHeight + gapHeight + (tracks.length * trackHeight);

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (isPlaying && scrollRef.current) {
      const playheadX = playheadPosition * pixelsPerFrame + trackHeaderWidth; // Include header offset
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
  }, [playheadPosition, pixelsPerFrame, isPlaying, trackHeaderWidth]);

  // Note: Playback animation is now handled by the Remotion player
  // The timeline just syncs with the player's frame updates

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    actions.setZoom(Math.min(zoom * 1.5, config.maxZoom));
  }, [zoom, actions, config.maxZoom]);

  const handleZoomOut = useCallback(() => {
    actions.setZoom(Math.max(zoom / 1.5, config.minZoom));
  }, [zoom, actions, config.minZoom]);

  // Zoom to fit all content
  const handleZoomToFit = useCallback(() => {
    if (tracks.length === 0) return;
    
    // Find the extent of all timeline items
    const allItems = tracks.flatMap(track => track.items);
    if (allItems.length === 0) return;
    
    const earliestStart = Math.min(...allItems.map(item => item.startTime));
    const latestEnd = Math.max(...allItems.map(item => item.startTime + item.duration));
    const contentDuration = latestEnd - earliestStart;
    
    if (contentDuration <= 0) return;
    
    // Calculate zoom to fit content with some padding
    const timelineContainer = scrollRef.current;
    if (!timelineContainer) return;
    
    const availableWidth = timelineContainer.clientWidth - trackHeaderWidth - 40; // Padding
    const idealZoom = availableWidth / contentDuration;
    
    // Clamp to zoom limits
    const newZoom = Math.max(config.minZoom, Math.min(idealZoom, config.maxZoom));
    actions.setZoom(newZoom);
    
    // Scroll to show the content
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollPosition = earliestStart * newZoom;
        scrollRef.current.scrollLeft = Math.max(0, scrollPosition - 20);
      }
    }, 50);
  }, [tracks, config, actions, trackHeaderWidth]);

  // Smart zoom presets
  const handleZoom25 = useCallback(() => actions.setZoom(0.25), [actions]);
  const handleZoom50 = useCallback(() => actions.setZoom(0.5), [actions]);
  const handleZoom100 = useCallback(() => actions.setZoom(1), [actions]);
  const handleZoom200 = useCallback(() => actions.setZoom(2), [actions]);

  // Add text handler
  const handleAddText = useCallback(() => {
    // Add text to the first track, or create a new track if none exist
    let targetTrackId = tracks.length > 0 ? tracks[0].id : '';
    
    if (tracks.length === 0) {
      actions.addTrack();
      // The new track will have a generated ID, we'll need to get it after state update
      // For now, we'll use a placeholder and let the addItem logic handle track creation
    }

    const newTextItem = {
      type: MediaType.TEXT,
      name: 'Sample Text',
      content: 'Sample Text',
      startTime: playheadPosition, // Add at current playhead position
      duration: 150, // 5 seconds at 30fps
      trackId: targetTrackId,
      properties: {
        x: 50,
        y: 50,
        width: 300,
        height: 100,
        fontSize: 48,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
      },
    };

    actions.addItem(newTextItem);
  }, [actions, tracks, playheadPosition]);

  // Split/razor tool handler - only splits selected items
  const handleSplitAtPlayhead = useCallback(() => {
    console.log('✂️ Split selected items at playhead position:', playheadPosition);
    
    if (state.selectedItems.length === 0) {
      console.log('✂️ No items selected to split');
      return;
    }
    
    // Find selected items that intersect with the playhead
    const allItems = tracks.flatMap(track => track.items);
    const selectedItemsToSplit = allItems.filter(item => 
      state.selectedItems.includes(item.id) &&
      playheadPosition > item.startTime && 
      playheadPosition < item.startTime + item.duration
    );
    
    if (selectedItemsToSplit.length === 0) {
      console.log('✂️ No selected items intersect with current playhead position');
      return;
    }
    
    console.log(`✂️ Splitting ${selectedItemsToSplit.length} selected item(s):`, selectedItemsToSplit.map(item => item.name));
    
    // Split each selected item
    selectedItemsToSplit.forEach(item => {
      actions.splitItem(item.id, playheadPosition);
    });
  }, [actions, tracks, playheadPosition, state.selectedItems]);


  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    console.log('⏪ Undo');
    actions.undo();
  }, [actions]);

  const handleRedo = useCallback(() => {
    console.log('⏩ Redo');
    actions.redo();
  }, [actions]);

  // Check if undo/redo is available
  const canUndo = state.history && state.history.past.length > 0;
  const canRedo = state.history && state.history.future.length > 0;

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
        case 'KeyT':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleAddText();
          }
          break;
        case 'KeyS':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleSplitAtPlayhead();
          }
          break;
        case 'KeyZ':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo(); // Ctrl/Cmd + Shift + Z
            } else {
              handleUndo(); // Ctrl/Cmd + Z
            }
          }
          break;
        case 'KeyY':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleRedo(); // Ctrl/Cmd + Y (alternative redo)
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playheadPosition, fps, totalDuration, actions, handleZoomIn, handleZoomOut, handleAddText, handleSplitAtPlayhead, handleUndo, handleRedo]);

  // Mouse wheel zoom with playhead preservation
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      
      // Calculate zoom change
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Smoother zoom steps
      const newZoom = Math.max(config.minZoom, Math.min(config.maxZoom, zoom * zoomFactor));
      
      if (newZoom !== zoom && scrollRef.current) {
        // Calculate current scroll position relative to playhead
        const currentScrollLeft = scrollRef.current.scrollLeft;
        const currentPlayheadPixel = playheadPosition * zoom + trackHeaderWidth;
        const scrollCenterPixel = currentScrollLeft + scrollRef.current.clientWidth / 2;
        
        // Calculate where the center of the view should be after zoom
        const newPlayheadPixel = playheadPosition * newZoom + trackHeaderWidth;
        const centerFrame = (scrollCenterPixel - trackHeaderWidth) / zoom;
        const newCenterPixel = centerFrame * newZoom + trackHeaderWidth;
        
        actions.setZoom(newZoom);
        
        // Adjust scroll to keep the view centered around the same time position
        setTimeout(() => {
          if (scrollRef.current) {
            const newScrollLeft = newCenterPixel - scrollRef.current.clientWidth / 2;
            scrollRef.current.scrollLeft = Math.max(0, newScrollLeft);
          }
        }, 0);
      }
    }
  }, [zoom, actions, config, playheadPosition, trackHeaderWidth]);

  // Show loading overlay when timeline is loading
  if (persistence.isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900 border-t border-gray-600">
        {/* Timeline Controls - disabled state */}
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-600 opacity-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 rounded bg-gray-700 text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-gray-400">Loading timeline...</div>
          </div>
        </div>
        
        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-lg font-medium text-white">Loading Timeline</div>
            <div className="text-sm text-gray-400 text-center max-w-md">
              Fetching your timeline data from the database...
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <TimeDisplay
              durationInFrames={totalDuration}
              fps={fps}
              playerRef={playerRef}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Undo/Redo buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                canUndo 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Undo (Ctrl/Cmd + Z)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                canRedo 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              title="Redo (Ctrl/Cmd + Shift + Z)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
              title="Zoom Out (Ctrl/Cmd + -)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Zoom level dropdown */}
            <div className="relative group">
              <button className="text-sm text-gray-300 min-w-16 text-center hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                {Math.round(zoom * 100)}%
              </button>
              
              {/* Zoom presets dropdown */}
              <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-1 space-y-1 min-w-24">
                  <button onClick={handleZoom25} className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded">25%</button>
                  <button onClick={handleZoom50} className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded">50%</button>
                  <button onClick={handleZoom100} className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded">100%</button>
                  <button onClick={handleZoom200} className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded">200%</button>
                  <hr className="border-gray-600" />
                  <button onClick={handleZoomToFit} className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded">Fit</button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
              title="Zoom In (Ctrl/Cmd + +)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Zoom to fit button */}
            <button
              onClick={handleZoomToFit}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              title="Zoom to fit all content"
            >
              Fit
            </button>
          </div>

          {/* Split/razor tool button */}
          <button
            onClick={handleSplitAtPlayhead}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors flex items-center space-x-1"
            title="Split items at playhead (Ctrl/Cmd + S)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>Split</span>
          </button>

          {/* Add text button */}
          <button
            onClick={handleAddText}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center space-x-1"
            title="Add text at current playhead position (Ctrl/Cmd + T)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span>Add Text</span>
          </button>

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

          {/* Gap between ruler and tracks */}
          <div className="bg-gray-900" style={{ height: gapHeight }} />

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

          {/* Playhead */}
          <Playhead />
        </div>
      </div>
    </div>
  );
}