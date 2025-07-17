"use client";

import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { Player, PlayerRef } from "@remotion/player";
// Removed preloadVideo import - using custom cache manager instead
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
import { createClientSupabaseClient } from '../lib/supabase/client';
import UpgradeModal from './UpgradeModal';
import { SupportModal } from './SupportModal';
import { exportToDaVinciResolveXML, downloadXMLFile } from '../lib/davinciResolveExport';
import {
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { videoCacheManager } from '../lib/video-cache';

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
  const { state, actions, persistenceActions } = useTimeline();
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // EDL Generation hook to track job state (only check for existing jobs when modal is opened)
  const {
    currentJob,
    isGenerating,
    isComplete
  } = { currentJob: null, isGenerating: false, isComplete: false} //useEDLGeneration(projectId, session, showGenerateModal);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>(aspectRatios[1]); // Default to 16:9
  const [playerDimensions, setPlayerDimensions] = useState({ width: 800, height: 450 });
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [editingTextId, setEditingTextId] = useState<string | undefined>();
  const playerRef = useRef<PlayerRef>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClientSupabaseClient();

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
    { name: 'DaVinci Resolve', icon: '🎨', format: 'ZIP with XML + Media', action: 'export' },
    { name: 'Avid Media Composer', icon: '📽️', format: 'AAF', action: 'export' },
    { name: 'Adobe After Effects', icon: '🌟', format: 'AEP Project', action: 'export' },
  ];

  const handleExportOption = useCallback((option: typeof exportOptions[0]) => {
    console.log(`Action: ${option.action} for ${option.name}`);
    setShowExportDropdown(false);
    
    if (option.action === 'render') {
      setShowRenderModal(true);
    } else if (option.name === 'DaVinci Resolve') {
      // Export to DaVinci Resolve as complete ZIP package via server
      const exportZip = async () => {
        try {
          // Show loading state
          const loadingMessage = 'Creating DaVinci Resolve export package...\n\nThis may take a moment while we download all media files from S3.';
          
          // For now, use alert - in production you'd use a proper loading modal
          const shouldContinue = confirm(loadingMessage + '\n\nClick OK to continue with the export.');
          
          if (!shouldContinue) {
            return;
          }
          
          // Call server-side endpoint to create ZIP with extended timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('Request timed out after 5 minutes');
            controller.abort();
          }, 300000); // 5 minutes timeout
          
          console.log('Starting export request...');
          const response = await fetch('/api/export/davinci-resolve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timelineState: state,
              projectName: 'Timeline Project'
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          console.log('Export request completed with status:', response.status);
          
          if (!response.ok) {
            let errorMessage = 'Failed to create export package';
            try {
              const errorData = await response.json();
              errorMessage = errorData.details || errorMessage;
            } catch (e) {
              // If we can't parse JSON, use the status text
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }
          
          // Get response data with download URL
          console.log('Response received, parsing JSON...');
          const responseData = await response.json();
          console.log('Response data:', responseData);
          
          if (!responseData.success || !responseData.downloadUrl) {
            throw new Error('Invalid response from server');
          }
          
          // Trigger download from S3 URL
          console.log('Downloading from S3 URL:', responseData.downloadUrl);
          const link = document.createElement('a');
          link.href = responseData.downloadUrl;
          link.download = responseData.filename || 'Timeline_Project_DaVinci_Export.zip';
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log('Download initiated successfully');
          
          // Show success message with file info
          const fileSizeMB = (responseData.size / 1024 / 1024).toFixed(2);
          alert(`DaVinci Resolve export package created successfully!\n\nFile: ${responseData.filename}\nSize: ${fileSizeMB} MB\n\nThe ZIP file contains:\n- timeline.xml (import this file)\n- Media/ folder with all video files\n- README.txt with detailed instructions\n\nTo use: Unzip the file and import timeline.xml in DaVinci Resolve.`);
        } catch (error) {
          console.error('Error exporting to DaVinci Resolve:', error);
          
          let errorMessage = 'Failed to create DaVinci Resolve export package.';
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = 'Export timed out. Large video files may take several minutes to process. Please try again or contact support if the issue persists.';
            } else if (error.message.includes('fetch')) {
              errorMessage = 'Network error while downloading export package. Please check your internet connection and try again.';
            } else {
              errorMessage = `Export failed: ${error.message}`;
            }
          }
          
          alert(errorMessage + '\n\nTip: For large video files, the export may take several minutes. Please be patient and avoid closing the browser.');
        }
      };
      
      exportZip();
    } else {
      // TODO: Implement actual export functionality for other editors
      alert(`Export to ${option.name} will be implemented soon!`);
    }
  }, [state]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [supabase, router]);

  // Handle profile actions
  const handleProfileAction = useCallback((action: string) => {
    setShowProfileDropdown(false);
    
    switch (action) {
      case 'settings':
        router.push('/settings');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  }, [router, handleLogout]);

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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileDropdown]);

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

  // Efficient video preloading using cache manager
  useEffect(() => {
    const videoItems = allTimelineItems.filter(item => item.type === MediaType.VIDEO && item.src);
    const uniqueVideos = Array.from(new Set(videoItems.map(item => item.src).filter(Boolean)));
    
    if (uniqueVideos.length > 0) {
      // Preload videos with proper throttling
      uniqueVideos.forEach((src, index) => {
        setTimeout(() => {
          videoCacheManager.preloadVideo(src!);
        }, index * 1000); // Stagger by 1 second each to avoid overwhelming
      });
    }
  }, [allTimelineItems]);

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
        videoCacheManager.preloadVideo(video.src);
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
        <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600 flex-shrink-0">
          {/* Left Side - Dashboard & Project Info */}
          <div className="flex items-center space-x-3 min-w-0">
            {/* Dashboard Button */}
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
              title="Back to Dashboard"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-600"></div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h1 className="text-sm font-semibold text-white truncate">Timeline Project</h1>
              </div>
              <div className="text-xs text-gray-400 hidden md:block">
                {state.tracks.length} track{state.tracks.length !== 1 ? 's' : ''} • {Math.round(state.totalDuration / state.fps)}s
              </div>
            </div>
            
            {/* Save Status - More subtle */}
            <div className="hidden sm:block">
              <SaveStatusIndicator />
            </div>

            {/* Built on Bolt - Moved to subtle indicator */}
            <div className="flex items-center space-x-1 bg-gray-700/50 rounded px-2 py-0.5 hidden lg:flex">
              <img 
                src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                alt="Built with Bolt" 
                className="w-3 h-3 opacity-60"
              />
              <span className="text-xs text-gray-400">Built on Bolt</span>
            </div>
          </div>
          
          {/* Right Side - Action Groups */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Media Tools Group */}
            <div className="flex items-center space-x-0.5 bg-gray-700/30 rounded-lg p-0.5">
              <button
                onClick={() => setShowMediaLibrary(!showMediaLibrary)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  showMediaLibrary 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-300 hover:bg-gray-600/50 hover:text-white'
                }`}
                title="Toggle Media Library"
              >
                <svg className="w-4 h-4 sm:mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Media</span>
              </button>
              
              <button
                onClick={() => setShowPropertyPanel(!showPropertyPanel)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  showPropertyPanel 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-300 hover:bg-gray-600/50 hover:text-white'
                }`}
                title="Toggle Properties Panel"
              >
                <svg className="w-4 h-4 sm:mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-2.49-1.16-2.87 0a1.5 1.5 0 01-2.226 1.31c-1.06-.61-2.43.72-1.82 1.78a1.5 1.5 0 010 2.59c-.61 1.06.76 2.39 1.82 1.78a1.5 1.5 0 012.226 1.31c.38 1.16 2.49 1.16 2.87 0a1.5 1.5 0 012.226-1.31c1.06.61 2.43-.72 1.82-1.78a1.5 1.5 0 010-2.59c.61-1.06-.76-2.39-1.82-1.78a1.5 1.5 0 01-2.226-1.31zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Properties</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-600 mx-1"></div>

            {/* AI Tools Group */}
            <div className="flex items-center space-x-0.5 bg-purple-900/20 rounded-lg p-0.5 border border-purple-800/30">
              <button 
                onClick={() => setShowChatPanel(true)}
                disabled={!projectId}
                className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-all duration-200 flex items-center space-x-1.5"
                title="Edit timeline with AI chat"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Edit by Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>

              <button 
                onClick={() => setShowGenerateModal(true)}
                disabled={!projectId}
                className={`px-2.5 py-1.5 ${
                  isComplete && currentJob
                    ? 'bg-emerald-600/80 hover:bg-emerald-600'
                    : isGenerating || currentJob
                    ? 'bg-amber-600/80 hover:bg-amber-600' 
                    : 'bg-purple-600/80 hover:bg-purple-600'
                } disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-all duration-200 flex items-center space-x-1.5`}
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
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {isComplete && currentJob 
                    ? 'Timeline Ready!' 
                    : isGenerating || currentJob 
                    ? 'Generating...' 
                    : 'Generate with AI'}
                </span>
                <span className="sm:hidden">
                  {isComplete && currentJob 
                    ? 'Ready!' 
                    : isGenerating || currentJob 
                    ? 'Gen...' 
                    : 'Generate'}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-600 mx-1"></div>

            {/* Utility Tools */}
            <button 
              onClick={() => setShowEDLViewer(true)}
              disabled={!projectId}
              className="px-2.5 py-1.5 bg-slate-600/80 hover:bg-slate-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-all duration-200 flex items-center space-x-1.5"
              title="View AI-generated Edit Decision List"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h6a1 1 0 100-2H6z" />
              </svg>
              <span className="hidden sm:inline">View EDL</span>
              <span className="sm:hidden">EDL</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-600 mx-1"></div>

            {/* Primary Export Action */}
            <div ref={exportDropdownRef} className="relative">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-emerald-600/25"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Render & Export</span>
                <span className="sm:hidden">Export</span>
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
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-b border-gray-600' 
                            : 'text-white hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{option.name}</div>
                          <div className={`text-xs ${option.primary ? 'text-emerald-200' : 'text-gray-400'}`}>
                            {option.format}
                          </div>
                        </div>
                        {option.primary && (
                          <span className="text-xs bg-emerald-500 px-2 py-1 rounded">
                            NEW
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileDropdownRef} className="relative ml-2">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group flex items-center space-x-2"
                title="Profile & Settings"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <svg 
                  className={`w-3 h-3 text-gray-400 group-hover:text-white transition-all duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Profile Dropdown menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                  <div className="py-1">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User'}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {session?.user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => handleProfileAction('settings')}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-2.49-1.16-2.87 0a1.5 1.5 0 01-2.226 1.31c-1.06-.61-2.43.72-1.82 1.78a1.5 1.5 0 010 2.59c-.61 1.06.76 2.39 1.82 1.78a1.5 1.5 0 012.226 1.31c.38 1.16 2.49 1.16 2.87 0a1.5 1.5 0 012.226-1.31c1.06.61 2.43-.72 1.82-1.78a1.5 1.5 0 010-2.59c.61-1.06-.76-2.39-1.82-1.78a1.5 1.5 0 01-2.226-1.31zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>Settings & Billing</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUpgradeModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h6zM4 14a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2z" />
                        </svg>
                        <span>Upgrade Plan</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowSupportModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <span>Help & Support</span>
                      </button>

                      <div className="border-t border-gray-600 my-1"></div>

                      <button
                        onClick={() => handleProfileAction('logout')}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center space-x-3"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 01-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
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
          onGenerationJobSuccessfully={(timelineData) => {
            console.log('AI Timeline generated successfully:', timelineData);
            // Reload timeline data from database
            persistenceActions.loadTimeline(projectId);
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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={(data) => {
          console.log('Upgrade successful:', data);
          // Could add toast notification here
        }}
      />

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
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