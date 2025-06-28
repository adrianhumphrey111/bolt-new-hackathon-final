"use client";

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Player, PlayerRef } from "@remotion/player";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Timeline } from './timeline/Timeline';
import { MediaLibrary } from './timeline/MediaLibrary';
import { PropertyPanel } from './timeline/PropertyPanel';
import { CanvasSizeSelector, aspectRatios, type AspectRatio } from './CanvasSizeSelector';
import { TimelineProvider, useTimeline } from './timeline/TimelineContext';
import {
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";

// Create a context for player controls
interface PlayerControlsContextType {
  playerRef: React.RefObject<PlayerRef>;
  handlePlayPause: () => void;
}

const PlayerControlsContext = createContext<PlayerControlsContextType | null>(null);

export function usePlayerControls() {
  const context = useContext(PlayerControlsContext);
  if (!context) {
    throw new Error('usePlayerControls must be used within a PlayerControlsProvider');
  }
  return context;
}

function VideoEditorContent() {
  const { state, actions } = useTimeline();
  const [showMediaLibrary, setShowMediaLibrary] = useState(true);
  const [showPropertyPanel, setShowPropertyPanel] = useState(true);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>(aspectRatios[1]); // Default to 16:9
  const [playerDimensions, setPlayerDimensions] = useState({ width: 800, height: 450 });
  const playerRef = useRef<PlayerRef>(null);

  // Get all timeline items from all tracks
  const allTimelineItems = state.tracks.flatMap(track => track.items);

  // Convert timeline state to Remotion player props
  const inputProps = {
    items: allTimelineItems,
    fps: state.fps,
  };

  // Sync player with timeline playhead
  useEffect(() => {
    if (playerRef.current) {
      const currentFrame = playerRef.current.getCurrentFrame();
      if (currentFrame !== state.playheadPosition) {
        playerRef.current.seekTo(state.playheadPosition);
      }
    }
  }, [state.playheadPosition]);

  // Sync timeline with player frame changes
  const handlePlayerFrame = useCallback((frame: number) => {
    if (frame !== state.playheadPosition) {
      actions.setPlayheadPosition(frame);
    }
  }, [state.playheadPosition, actions]);

  // Handle play/pause from custom controls
  const handlePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (state.isPlaying) {
        playerRef.current.pause();
        actions.setPlaying(false);
      } else {
        playerRef.current.play();
        actions.setPlaying(true);
      }
    }
  }, [state.isPlaying, actions]);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((aspectRatio: AspectRatio) => {
    console.log('📐 Changing aspect ratio to:', aspectRatio.label);
    setCurrentAspectRatio(aspectRatio);
  }, []);

  // Calculate player dimensions based on aspect ratio
  const getPlayerDimensions = useCallback(() => {
    if (typeof window === 'undefined') {
      return { width: 800, height: 450 };
    }
    
    // Account for media library (320px) and property panel (320px) when visible
    const sidebarWidth = (showMediaLibrary ? 320 : 0) + (showPropertyPanel ? 320 : 0);
    const availableWidth = Math.max(300, window.innerWidth - sidebarWidth - 60); // Ensure minimum width
    
    // Reserve space for timeline (320px) and header/footer (~120px)
    const availableHeight = Math.max(200, window.innerHeight - 320 - 120);
    
    const maxWidth = Math.min(availableWidth, 1000); // Conservative max width
    const maxHeight = Math.min(availableHeight, 600);
    
    const aspectRatio = currentAspectRatio.width / currentAspectRatio.height;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    // If height exceeds max, scale down
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    // Ensure minimum sizes but be conservative
    width = Math.max(width, 300);
    height = Math.max(height, 180);
    
    return { width: Math.round(width), height: Math.round(height) };
  }, [currentAspectRatio, showMediaLibrary, showPropertyPanel]);

  // Update player dimensions when dependencies change
  useEffect(() => {
    const updateDimensions = () => {
      setPlayerDimensions(getPlayerDimensions());
    };
    
    updateDimensions();
    
    const handleResize = () => {
      // Auto-close panels if screen is too small (less than 1024px width)
      if (window.innerWidth < 1024) {
        if (showMediaLibrary && showPropertyPanel) {
          // Close property panel first if both are open
          setShowPropertyPanel(false);
        }
      }
      if (window.innerWidth < 768) {
        // Close media library too on very small screens
        setShowMediaLibrary(false);
        setShowPropertyPanel(false);
      }
      updateDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    // Run resize handler once on mount to handle initial small screens
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [getPlayerDimensions, showMediaLibrary, showPropertyPanel]);

  const playerControlsValue = {
    playerRef,
    handlePlayPause,
  };

  return (
    <PlayerControlsContext.Provider value={playerControlsValue}>
      <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-600 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">Remotion Video Editor</h1>
          <div className="text-sm text-gray-400 hidden sm:block">
            {state.tracks.length} track{state.tracks.length !== 1 ? 's' : ''} • {Math.round(state.totalDuration / state.fps)}s
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* View toggles */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowMediaLibrary(!showMediaLibrary)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showMediaLibrary 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Media
            </button>
            
            <button
              onClick={() => setShowPropertyPanel(!showPropertyPanel)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showPropertyPanel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Properties
            </button>
          </div>

          {/* Export button */}
          <button className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Export Video</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Media Library */}
        {showMediaLibrary && <MediaLibrary />}

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center bg-black p-2 overflow-hidden min-h-0">
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Canvas Size Selector - Top Left */}
              <div className="absolute top-4 left-4 z-20">
                <CanvasSizeSelector
                  currentAspectRatio={currentAspectRatio}
                  onAspectRatioChange={handleAspectRatioChange}
                />
              </div>

              {/* Player Container */}
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <Player
                  ref={playerRef}
                  component={TimelineComposition}
                  inputProps={inputProps}
                  durationInFrames={state.totalDuration}
                  fps={state.fps}
                  compositionHeight={currentAspectRatio.height}
                  compositionWidth={currentAspectRatio.width}
                  style={playerDimensions}
                  controls={false}
                  autoPlay={false}
                  loop={false}
                  onFrameUpdate={handlePlayerFrame}
                />
              </div>

              {/* Custom Player Controls Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded p-3 flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                >
                  {state.isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 text-white text-sm font-mono">
                  {Math.floor(state.playheadPosition / state.fps / 60)}:
                  {Math.floor((state.playheadPosition / state.fps) % 60).toString().padStart(2, '0')}:
                  {Math.floor(state.playheadPosition % state.fps).toString().padStart(2, '0')}
                  {' / '}
                  {Math.floor(state.totalDuration / state.fps / 60)}:
                  {Math.floor((state.totalDuration / state.fps) % 60).toString().padStart(2, '0')}:
                  {Math.floor(state.totalDuration % state.fps).toString().padStart(2, '0')}
                </div>

                <div className="text-white text-sm">
                  {Math.round(state.zoom * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-80 flex-shrink-0 border-t border-gray-600 overflow-hidden">
            <Timeline />
          </div>
        </div>

        {/* Property Panel */}
        {showPropertyPanel && <PropertyPanel />}
      </div>

      {/* Status Bar */}
      <footer className="px-4 py-2 bg-gray-800 border-t border-gray-600 text-sm text-gray-400 flex-shrink-0">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span>Ready</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{state.fps} FPS</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">{VIDEO_WIDTH}x{VIDEO_HEIGHT}</span>
          </div>
          
          <div className="flex items-center space-x-2 min-w-0">
            <span className="truncate">{state.selectedItems.length} selected</span>
            {state.selectedItems.length > 0 && (
              <>
                <span className="hidden lg:inline">•</span>
                <span className="hidden lg:inline whitespace-nowrap">Press Spacebar to play/pause</span>
              </>
            )}
          </div>
        </div>
      </footer>
      </div>
    </PlayerControlsContext.Provider>
  );
}

export function VideoEditor() {
  return (
    <TimelineProvider>
      <VideoEditorContent />
    </TimelineProvider>
  );
}