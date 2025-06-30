"use client";

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Player, PlayerRef } from "@remotion/player";
import { preloadVideo } from "@remotion/preload";
import { TimelineComposition } from "../remotion/TimelineComposition";
import { Timeline } from './timeline/Timeline';
import { MediaLibrary, ProjectProvider, useProject } from './timeline/MediaLibrary';
import { PropertyPanel } from './timeline/PropertyPanel';
import { GenerateAIModal } from './timeline/GenerateAIModal';
import { DragProvider } from './timeline/DragContext';
import { SaveStatusIndicator } from './timeline/SaveStatusIndicator';
import { AIChatPanel } from './timeline/AIChatPanel';
import { RenderModal } from './timeline/RenderModal';
import { EDLViewer } from './timeline/EDLViewer';
import { CanvasSizeSelector, aspectRatios, type AspectRatio } from './CanvasSizeSelector';
import { TimelineProvider, useTimeline } from './timeline/TimelineContext';
import { TimeDisplay } from './timeline/TimeDisplay';
import { SeekBar } from './timeline/SeekBar';
import { TimelineItem, MediaType } from '../../types/timeline';
import { useAuthContext } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEDLGeneration } from '../hooks/useEDLGeneration';
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
  const { isAuthenticated, loading: authLoading, session } = useAuthContext();
  const router = useRouter();
  const [showMediaLibrary, setShowMediaLibrary] = useState(true);
  const [showPropertyPanel, setShowPropertyPanel] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [showEDLViewer, setShowEDLViewer] = useState(false);
  
  // EDL Generation hook to track job state (only check for existing jobs when modal is opened)
  const {
    currentJob,
    isGenerating,
    isComplete
  } = useEDLGeneration(projectId, session, showGenerateModal);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>(aspectRatios[1]); // Default to 16:9
  const [playerDimensions, setPlayerDimensions] = useState({ width: 800, height: 450 });
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [editingTextId, setEditingTextId] = useState<string | undefined>();
  const playerRef = useRef<PlayerRef>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

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

  // Export options
  const exportOptions = [
    { name: 'Render Video', icon: '🎬', format: 'Generate MP4 video', action: 'render', primary: true },
    { name: 'Adobe Premiere Pro', icon: '🎬', format: 'XML (Final Cut Pro XML)', action: 'export' },
    { name: 'Final Cut Pro', icon: '🎭', format: 'FCPXML', action: 'export' },
    { name: 'CapCut', icon: '✂️', format: 'SRT/XML', action: 'export' },
    { name: 'DaVinci Resolve', icon: '🎨', format: 'XML/AAF', action: 'export' },
    { name: 'Avid Media Composer', icon: '📽️', format: 'AAF', action: 'export' },
    { name: 'Adobe After Effects', icon: '🌟', format: 'AEP Project', action: 'export' },
  ];

  const handleExportOption = useCallback((option: typeof exportOptions[0]) => {
    console.log(`Action: ${option.action} for ${option.name}`);
    setShowExportDropdown(false);
    
    if (option.action === 'render') {
      setShowRenderModal(true);
    } else {
      // TODO: Implement actual export functionality for editors
      alert(`Export to ${option.name} will be implemented soon!`);
    }
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

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportDropdown]);

  // Collect all transitions from all tracks
  const allTransitions = state.tracks.flatMap(track => track.transitions || []);

  // Convert timeline state to Remotion player props
  const inputProps = {
    items: allTimelineItems,
    transitions: allTransitions,
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

  // Preload upcoming videos to prevent flickering
  useEffect(() => {
    const currentTime = state.playheadPosition;
    const lookAheadFrames = state.fps * 5; // Look ahead 5 seconds
    
    // Find videos that will start within the next 5 seconds
    const upcomingVideos = allTimelineItems
      .filter(item => 
        item.type === MediaType.VIDEO && 
        item.src &&
        item.startTime > currentTime && 
        item.startTime < currentTime + lookAheadFrames
      );
    
    // Preload these videos
    upcomingVideos.forEach(video => {
      if (video.src) {
        console.log('🎬 Preloading upcoming video:', video.name, 'starting at frame', video.startTime);
        preloadVideo(video.src);
      }
    });
  }, [state.playheadPosition, allTimelineItems, state.fps]);

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
    <DragProvider>
      <PlayerControlsContext.Provider value={playerControlsValue}>
        <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-600 flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white truncate">Remotion Video Editor</h1>
            <div className="flex items-center space-x-1 bg-gray-700 rounded-full px-2 py-1">
              <img 
                src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                alt="Built with Bolt" 
                className="w-4 h-4"
              />
              <span className="text-xs text-gray-300 hidden sm:block">Built on Bolt</span>
            </div>
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

          {/* Edit by Chat button */}
          <button 
            onClick={() => setShowChatPanel(true)}
            disabled={!projectId}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm whitespace-nowrap flex items-center space-x-2"
            title="Edit timeline with AI chat"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Edit by Chat</span>
            <span className="sm:hidden">Chat</span>
          </button>

          {/* Generate with AI button */}
          <button 
            onClick={() => setShowGenerateModal(true)}
            disabled={!projectId}
            className={`px-3 py-2 ${
              isComplete && currentJob
                ? 'bg-green-600 hover:bg-green-700'
                : isGenerating || currentJob
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-purple-600 hover:bg-purple-700'
            } disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm whitespace-nowrap flex items-center space-x-2`}
            title={
              isComplete && currentJob
                ? "Timeline ready! Click to apply to timeline"
                : isGenerating || currentJob 
                ? "AI generation in progress - click to view progress" 
                : "Generate video timeline with AI"
            }
          >
            {isComplete && currentJob ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : isGenerating || currentJob ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49zM10 18.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H10zm-3.5-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H6.5zm7-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H13.5z" clipRule="evenodd" />
              </svg>
            )}
            <span className="hidden sm:inline">
              {isComplete && currentJob 
                ? 'Timeline Ready!' 
                : isGenerating || currentJob 
                ? 'Generating with AI' 
                : 'Generate with AI'}
            </span>
            <span className="sm:hidden">
              {isComplete && currentJob 
                ? 'Ready!' 
                : isGenerating || currentJob 
                ? 'Generating' 
                : 'Generate'}
            </span>
          </button>

          {/* View EDL button */}
          <button 
            onClick={() => setShowEDLViewer(true)}
            disabled={!projectId}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm whitespace-nowrap flex items-center space-x-2"
            title="View AI-generated Edit Decision List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h6a1 1 0 100-2H6z" />
            </svg>
            <span className="hidden sm:inline">View EDL</span>
            <span className="sm:hidden">EDL</span>
          </button>

          {/* Export dropdown */}
          <div ref={exportDropdownRef} className="relative">
            <button 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm whitespace-nowrap flex items-center space-x-2"
            >
              <span className="hidden sm:inline">Render & Export</span>
              <span className="sm:hidden">Render</span>
              <svg 
                className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-600">
                    Render & Export Options
                  </div>
                  {exportOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleExportOption(option)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center space-x-3 ${
                        option.primary 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white border-b border-gray-600' 
                          : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium">{option.name}</div>
                        <div className={`text-xs ${option.primary ? 'text-purple-200' : 'text-gray-400'}`}>
                          {option.format}
                        </div>
                      </div>
                      {option.primary && (
                        <span className="text-xs bg-purple-500 px-2 py-1 rounded">
                          NEW
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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

      {/* AI Chat Panel */}
      {projectId && (
        <AIChatPanel
          projectId={projectId}
          isOpen={showChatPanel}
          onClose={() => setShowChatPanel(false)}
        />
      )}

      {/* Render Modal */}
      {projectId && (
        <RenderModal
          projectId={projectId}
          isOpen={showRenderModal}
          onClose={() => setShowRenderModal(false)}
        />
      )}

      {/* EDL Viewer */}
      {projectId && (
        <EDLViewer
          projectId={projectId}
          isOpen={showEDLViewer}
          onClose={() => setShowEDLViewer(false)}
        />
      )}
        </div>
      </PlayerControlsContext.Provider>
    </DragProvider>
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