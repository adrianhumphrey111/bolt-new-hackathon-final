import React, { useState, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig, Img, Video, Audio, Sequence, AbsoluteFill, getInputProps, useCurrentScale } from 'remotion';
import { TimelineItem, MediaType, Transition } from '../../types/timeline';
import { TextLayer } from '../components/TextLayer';
import { TextSelectionOutline } from '../components/TextSelectionOutline';
import { VideoCanvas } from './VideoCanvas';

interface TimelineCompositionProps {
  // New format (preferred)
  timelineState?: {
    tracks: { id: string; name: string; items: TimelineItem[]; transitions: Transition[] }[];
    playheadPosition: number;
    totalDuration: number;
    zoom: number;
    fps: number;
    selectedItems: string[];
    isPlaying: boolean;
    aiSelectedTimelineItems?: string[];
  };
  // Legacy format (fallback)
  items?: TimelineItem[];
  transitions?: Transition[];
  fps?: number;
  // Common props
  selectedItemId?: string;
  editingTextId?: string;
  aiSelectedTimelineItems?: string[];
  onItemSelect?: (itemId: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<TimelineItem>) => void;
  onTextEdit?: (itemId: string) => void;
  onCanvasClick?: () => void;
  onAiToggleItem?: (itemId: string) => void;
}


export function TimelineComposition(props: TimelineCompositionProps) {
  const { width, height, durationInFrames } = useVideoConfig();
  const currentFrame = useCurrentFrame();
  const scale = 1; // Use fixed scale for now - useCurrentScale might not work in composition context
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  
  const { 
    timelineState: componentTimelineState,
    items: legacyItems,
    transitions: legacyTransitions,
    fps: legacyFps,
    selectedItemId: externalSelectedId,
    editingTextId,
    aiSelectedTimelineItems: propAiSelected,
    onItemSelect,
    onItemUpdate,
    onTextEdit, 
    onCanvasClick,
    onAiToggleItem
  } = props;
  
  // Use internal selection state if external is not provided
  const selectedItemId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  
  // Use the timeline state from component props
  const timelineState = componentTimelineState;

  // Handle both new timelineState format and legacy items/transitions format
  let actualTimelineState;
  let items: TimelineItem[];
  let transitions: Transition[];
  let timelineFps: number;

  if (timelineState && timelineState.tracks) {
    // New format: use timelineState
    actualTimelineState = timelineState;
    items = timelineState.tracks.flatMap(track => track.items);
    transitions = timelineState.tracks.flatMap(track => track.transitions);
    timelineFps = timelineState.fps;
  } else if (legacyItems && legacyTransitions && legacyFps) {
    // Legacy format: use items/transitions directly
    items = legacyItems;
    transitions = legacyTransitions;
    timelineFps = legacyFps;
    // Create a mock timeline state for duration calculation
    const maxEndTime = items.length > 0 ? Math.max(...items.map(item => item.startTime + item.duration)) : durationInFrames;
    actualTimelineState = {
      tracks: [{ id: 'legacy', name: 'Legacy', items, transitions }],
      totalDuration: maxEndTime,
      fps: legacyFps,
      playheadPosition: 0,
      zoom: 1,
      selectedItems: [],
      isPlaying: false,
    };
  } else {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: 24 }}>
          No timeline data found
        </div>
      </AbsoluteFill>
    );
  }
  
  // Calculate actual timeline duration and stop rendering beyond it  
  const actualDuration = actualTimelineState?.totalDuration || durationInFrames;
  
  // Don't render frames beyond the actual timeline duration
  if (currentFrame >= actualDuration) {
    return null;
  }

  // Items and transitions are already extracted above
  
  // Extract AI selection data
  const aiSelectedItems = timelineState?.aiSelectedTimelineItems || propAiSelected || [];

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string) => {
    if (onItemSelect) {
      onItemSelect(itemId);
    } else {
      setInternalSelectedId(itemId);
    }
  }, [onItemSelect]);

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(() => {
    if (onCanvasClick) {
      onCanvasClick();
    } else {
      setInternalSelectedId(null);
    }
  }, [onCanvasClick]);

  // Helper function to create a sequence component for a single item
  const createSequenceForItem = (item: TimelineItem, index: number) => {
    // Calculate premount time based on item type
    const getPremountFrames = (itemType: MediaType) => {
      switch (itemType) {
        case MediaType.VIDEO:
          return 60; // 2 seconds at 30fps for videos
        case MediaType.AUDIO:
          return 60; // Same as video for sync consistency
        default:
          return 0; // No premounting for images/text
      }
    };

    const premountFrames = getPremountFrames(item.type);

    return (
      <Sequence
        key={item.id}
        from={item.startTime}
        durationInFrames={item.duration}
        premountFor={premountFrames}
        layout="none"
      >
        <VideoCanvas
          item={item}
          canvasWidth={width}
          canvasHeight={height}
          isSelected={selectedItemId === item.id}
          isAiSelected={aiSelectedItems.includes(item.id)}
          onSelect={handleItemSelect}
          onUpdate={onItemUpdate || (() => {})}
          onAiToggle={onAiToggleItem}
          scale={scale}
        />
      </Sequence>
    );
  };

  // Simple helper to sort all items by priority for rendering
  const sortAllItems = (allItems: TimelineItem[]) => {
    return allItems.sort((a, b) => {
      const trackPriorityA = getTrackPriority(a.trackId || 'default');
      const trackPriorityB = getTrackPriority(b.trackId || 'default');
      if (trackPriorityA !== trackPriorityB) {
        return trackPriorityA - trackPriorityB;
      }
      
      const typeA = getMediaTypePriority(a.type);
      const typeB = getMediaTypePriority(b.type);
      return typeA - typeB;
    });
  };

  // Helper function to get track priority (Track 1 has highest priority)
  const getTrackPriority = (trackId: string) => {
    // Extract track number from track name (e.g., "Track 1", "Track 2")
    const getTrackNumber = (id: string) => {
      const match = id.match(/Track (\d+)/);
      return match ? parseInt(match[1], 10) : 999; // Default high number for unknown tracks
    };
    
    const trackNumber = getTrackNumber(trackId);
    // Return higher number for Track 1 so it renders on top
    // Track 1 = 1000, Track 2 = 999, etc.
    return 1000 - trackNumber;
  };

  // Helper function to get media type priority (higher number = on top)
  const getMediaTypePriority = (type: MediaType) => {
    switch (type) {
      case MediaType.TEXT: return 4;    // Text on top
      case MediaType.IMAGE: return 3;   // Images above videos
      case MediaType.VIDEO: return 2;   // Videos in middle
      case MediaType.AUDIO: return 1;   // Audio lowest (invisible anyway)
      default: return 0;
    }
  };

  // Sort all items by priority for simple rendering
  const sortedItems = sortAllItems(items);

  // Sort outlines to render selected items on top
  const displaySelectedItemOnTop = (items: TimelineItem[]) => {
    const selectedItems = items.filter(item => item.id === selectedItemId);
    const unselectedItems = items.filter(item => item.id !== selectedItemId);
    return [...unselectedItems, ...selectedItems];
  };

  // Filter text items for outline rendering
  const textItems = items.filter(item => item.type === MediaType.TEXT);
  const sortedOutlines = displaySelectedItemOnTop(textItems);
  const isDragging = items.some(item => item.properties?.isDragging);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
      }}
      onPointerDown={(e) => {
        // Only handle canvas clicks if no other element handles it
        if (e.target === e.currentTarget && e.button === 0) {
          handleCanvasClick();
        }
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1), transparent)',
        }}
      />

      {/* Layer container - videos constrained to canvas but outlines can overflow */}
      <AbsoluteFill>
        {/* Render all items as simple sequences */}
        {sortedItems.map((item, index) => createSequenceForItem(item, index))}
      </AbsoluteFill>


      {/* Text selection outlines are now handled within VideoCanvas */}

      {/* Frame counter and layer info overlay (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: 'white',
            fontSize: 12,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: 4,
            zIndex: 1000,
            maxWidth: 300,
          }}
        >
          <div>Frame: {currentFrame}</div>
          <div style={{ marginTop: 8, fontSize: 10 }}>
            Total Items: {items.length}
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            Video Items: {items.filter(item => item.type === MediaType.VIDEO).length}
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            Text Items: {textItems.length}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}