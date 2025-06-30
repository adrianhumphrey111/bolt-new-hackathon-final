"use client";

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Player, PlayerRef } from "@remotion/player";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Timeline } from './timeline/Timeline';
import { MediaLibrary, ProjectProvider, useProject } from './timeline/MediaLibrary';
import { PropertyPanel } from './timeline/PropertyPanel';
import { GenerateAIModal } from './timeline/GenerateAIModal';
import { SaveStatusIndicator } from './timeline/SaveStatusIndicator';
import { CanvasSizeSelector, aspectRatios, type AspectRatio } from './CanvasSizeSelector';
import { TimelineProvider, useTimeline } from './timeline/TimelineContext';
import { TimeDisplay } from './timeline/TimeDisplay';
import { SeekBar } from './timeline/SeekBar';
import { TimelineItem } from '../../types/timeline';
import { useAuthContext } from './AuthProvider';
import { useRouter } from 'next/navigation';
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
  const { projectId } = useProject();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [showMediaLibrary, setShowMediaLibrary] = useState(true);
  const [showPropertyPanel, setShowPropertyPanel] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>(aspectRatios[1]); // Default to 16:9
  const [playerDimensions, setPlayerDimensions] = useState({ width: 800, height: 450 });
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [editingTextId, setEditingTextId] = useState<string | undefined>();
  const playerRef = useRef<PlayerRef>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Get all timeline items from all tracks
  const allTimelineItems = state.tracks.flatMap(track => track.items);

  // Interactive handlers
  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setEditingTextId(undefined); // Stop editing when selecting
  }, []);

  const handleItemUpdate = useCallback((itemId: string, updates: Partial<TimelineItem>) => {
    actions.updateItem(itemId, updates);
  }, [actions]);

  const handleTextEdit = useCallback((itemId: string) => {
    setEditingTextId(editingTextId === itemId ? undefined : itemId);
  }, [editingTextId]);

  const handleCanvasClick = useCallback(() => {
    setSelectedItemId(undefined);
    setEditingTextId(undefined);
  }, []);

  // Keyboard shortcuts for canvas interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts in input fields
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          actions.removeItem(selectedItemId);
          setSelectedItemId(undefined);
          setEditingTextId(undefined);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedItemId(undefined);
        setEditingTextId(undefined);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, actions]);

  // Convert timeline state to Remotion player props
  const inputProps = {
    items: allTimelineItems,
    fps: state.fps,
    selectedItemId,
    editingTextId,
    onItemSelect: handleItemSelect,
    onItemUpdate: handleItemUpdate,
    onTextEdit: handleTextEdit,
    onCanvasClick: handleCanvasClick,
  };

  // Track if we're manually seeking to avoid sync conflicts
  const isManualSeek = useRef(false);

  // Sync player with timeline playhead (when user moves playhead manually)
  useEffect(() => {
    if (playerRef.current && !isManualSeek.current) {
      const currentFrame = playerRef.current.getCurrentFrame();
      if (Math.abs(currentFrame - state.playheadPosition) > 1) {
        console.log('🎬 Seeking player to frame:', state.playheadPosition, 'from', currentFrame);
        isManualSeek.current = true;
        playerRef.current.seekTo(state.playheadPosition);
        // Reset flag after a brief delay
        setTimeout(() => {
          isManualSeek.current = false;
        }, 100);
      }
    }
  }, [state.playheadPosition]);

  // Sync timeline with player frame changes during playback
  const handlePlayerFrame = useCallback((frame: number) => {
    console.log('🎬 Player frame update via onFrameUpdate:', frame);
    // Always update timeline position from player
    actions.setPlayheadPosition(frame);
  }, [actions]);

  // Direct player frame sync using event listeners with throttling
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    let lastUpdateTime = 0;
    const throttleMs = 16; // ~60fps max updates

    const onFrameUpdate = () => {
      const now = Date.now();
      if (now - lastUpdateTime < throttleMs) return;
      
      const currentFrame = player.getCurrentFrame();
      console.log('🎬 Player frame update via listener:', currentFrame);
      actions.setPlayheadPosition(currentFrame);
      lastUpdateTime = now;
    };

    player.addEventListener('frameupdate', onFrameUpdate);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
    };
  }, [actions]);

  // Handle player play/pause events
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      console.log('▶️ Player started playing');
      actions.setPlaying(true);
    };

    const handlePause = () => {
      console.log('⏸️ Player paused');
      actions.setPlaying(false);
    };

    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);

    return () => {
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
    };
  }, [actions]);

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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <PlayerControlsContext.Provider value={playerControlsValue}>
      <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-600 flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white truncate">Remotion Video Editor</h1>
            <div className="text-sm text-gray-400 hidden sm:block">
              {state.tracks.length} track{state.tracks.length !== 1 ? 's' : ''} • {Math.round(state.totalDuration / state.fps)}s
            </div>
          </div>
          
          {/* Save Status Indicator */}
          <SaveStatusIndicator />
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

          {/* Generate with AI button */}
          <button 
            onClick={() => setShowGenerateModal(true)}
            disabled={!projectId}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm whitespace-nowrap flex items-center space-x-2"
            title="Generate video timeline with AI"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49zM10 18.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H10zm-3.5-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H6.5zm7-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H13.5z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Generate with AI</span>
            <span className="sm:hidden">Generate</span>
          </button>

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
                  overflowVisible={true}
                  onFrameUpdate={handlePlayerFrame}
                />
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
            <span className="hidden lg:inline">•</span>
            <span className="hidden lg:inline">Timeline: {Math.round(state.totalDuration / state.fps)}s</span>
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
      
      {/* Generate AI Modal */}
      {projectId && (
        <GenerateAIModal
          projectId={projectId}
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onComplete={(shotList) => {
            console.log('AI Timeline generated with', shotList.length, 'clips');
          }}
        />
      )}
      </div>
    </PlayerControlsContext.Provider>
  );
}

interface VideoEditorProps {
  projectId?: string | null;
}

export function VideoEditor({ projectId = null }: VideoEditorProps) {
  return (
    <ProjectProvider projectId={projectId}>
      <TimelineProvider projectId={projectId}>
        <VideoEditorContent />
      </TimelineProvider>
    </ProjectProvider>
  );
}