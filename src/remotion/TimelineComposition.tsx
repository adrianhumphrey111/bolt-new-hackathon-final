import React from 'react';
import { useCurrentFrame, useVideoConfig, Img, Video, Audio, Sequence, AbsoluteFill } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { TimelineItem, MediaType, Transition } from '../../types/timeline';
import { TextLayer } from '../components/TextLayer';
import { TextSelectionOutline } from '../components/TextSelectionOutline';

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
  };
  // Legacy format (fallback)
  items?: TimelineItem[];
  transitions?: Transition[];
  fps?: number;
  // Common props
  selectedItemId?: string;
  editingTextId?: string;
  onItemSelect?: (itemId: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<TimelineItem>) => void;
  onTextEdit?: (itemId: string) => void;
  onCanvasClick?: () => void;
}

interface TimelineItemRendererProps {
  item: TimelineItem;
  layerIndex: number;
  fps: number;
  selectedItemId?: string;
  editingTextId?: string;
  onItemSelect?: (itemId: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<TimelineItem>) => void;
  onTextEdit?: (itemId: string) => void;
}

function TimelineItemRenderer({ 
  item, 
  layerIndex, 
  fps,
  selectedItemId,
  editingTextId, 
  onItemSelect,
  onItemUpdate,
  onTextEdit 
}: TimelineItemRendererProps) {
  // With Sequence, we don't need to check timing - Sequence handles that
  // useCurrentFrame() will give us the frame relative to the Sequence start
  const relativeFrame = useCurrentFrame();
  
  // Default positioning and sizing with explicit z-index for layering
  const style: React.CSSProperties = {
    position: 'absolute',
    left: item.properties?.x || 0,
    top: item.properties?.y || 0,
    width: item.properties?.width || '100%',
    height: item.properties?.height || 'auto',
    transform: `scale(${item.properties?.scale || 1}) rotate(${item.properties?.rotation || 0}deg)`,
    opacity: item.properties?.opacity || 1,
    zIndex: layerIndex, // Explicit z-index based on sort order
  };

  switch (item.type) {
    case MediaType.VIDEO:
      if (!item.src) return null;
      
      // Extract trim points from item properties (from AI analysis)
      const originalStartTime = item.properties?.originalStartTime || item.properties?.trim_start || 0;
      const originalEndTime = item.properties?.originalEndTime || item.properties?.trim_end || 0;
      // Use passed fps parameter
      
      // Convert seconds to frames for Remotion
      const startFromFrame = Math.floor(originalStartTime * fps);
      const endAtFrame = originalEndTime > 0 ? Math.floor(originalEndTime * fps) : undefined;
      
      // Log for debugging
      console.log(`🎬 VIDEO COMPONENT - Rendering video ${item.name}:`, {
        src: item.src,
        startFromFrame,
        endAtFrame,
        originalStartTime,
        originalEndTime,
        fps,
        relativeFrame,
        style,
        itemId: item.id,
      });
      
      return (
        <Video
          src={item.src}
          startFrom={startFromFrame}  // Start trim point in frames
          endAt={endAtFrame}          // End trim point in frames
          pauseWhenBuffering={true}   // Pause player when video is loading
          style={style}
        />
      );

    case MediaType.AUDIO:
      if (!item.src) return null;
      return (
        <Audio
          src={item.src}
        />
      );

    case MediaType.IMAGE:
      if (!item.src) return null;
      return (
        <Img
          src={item.src}
          style={style}
        />
      );

    case MediaType.TEXT:
      return (
        <TextLayer
          item={item}
          isEditing={editingTextId === item.id}
          onSave={(newContent) => onItemUpdate?.(item.id, { content: newContent })}
          onCancel={() => onTextEdit?.(item.id)} // Toggle off editing
        />
      );

    default:
      return null;
  }
}

export function TimelineComposition(props: TimelineCompositionProps) {
  const { width, height, durationInFrames } = useVideoConfig();
  const currentFrame = useCurrentFrame();

  // 🔍 DEBUG: Log ALL props received by composition
  console.log('🎬 TIMELINE COMPOSITION - ALL PROPS RECEIVED:', JSON.stringify(props, null, 2));
  console.log('🎬 TIMELINE COMPOSITION - Props keys:', Object.keys(props));
  
  const { 
    timelineState,
    items: legacyItems,
    transitions: legacyTransitions,
    fps: legacyFps,
    selectedItemId,
    editingTextId, 
    onItemSelect,
    onItemUpdate,
    onTextEdit, 
    onCanvasClick 
  } = props;

  // Handle both new timelineState format and legacy items/transitions format
  let actualTimelineState;
  let items: TimelineItem[];
  let transitions: Transition[];
  let timelineFps: number;

  if (timelineState && timelineState.tracks) {
    // New format: use timelineState
    console.log('🎬 TIMELINE COMPOSITION - Using new timelineState format');
    actualTimelineState = timelineState;
    items = timelineState.tracks.flatMap(track => track.items);
    transitions = timelineState.tracks.flatMap(track => track.transitions);
    timelineFps = timelineState.fps;
  } else if (legacyItems && legacyTransitions && legacyFps) {
    // Legacy format: use items/transitions directly
    console.log('🎬 TIMELINE COMPOSITION - Using legacy items/transitions format');
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
    console.log('🎬 TIMELINE COMPOSITION - No valid timeline data found');
    console.log('🎬 TIMELINE COMPOSITION - Available props:', Object.keys(props));
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
    console.log(`🎬 TIMELINE COMPOSITION - Frame ${currentFrame} beyond duration ${actualDuration}, returning null`);
    return null;
  }

  // Items and transitions are already extracted above

  // Debug logging for render
  console.log('🎬 TIMELINE COMPOSITION - Render frame:', currentFrame);
  console.log('🎬 TIMELINE COMPOSITION - Using timeline state:', JSON.stringify(actualTimelineState, null, 2));
  console.log('🎬 TIMELINE COMPOSITION - Extracted data:', {
    totalDuration: actualTimelineState.totalDuration,
    fps: actualTimelineState.fps,
    tracksCount: actualTimelineState.tracks.length,
    itemsCount: items.length,
    transitionsCount: transitions.length,
    currentFrame,
    videoConfig: { width, height },
  });

  // Log each item being rendered
  items.forEach((item, index) => {
    const isActive = currentFrame >= item.startTime && currentFrame < item.startTime + item.duration;
    console.log(`🎬 TIMELINE COMPOSITION - Item ${index + 1} (${item.id}):`, {
      name: item.name,
      type: item.type,
      startTime: item.startTime,
      duration: item.duration,
      trackId: item.trackId,
      isActive,
      hasSrc: !!item.src,
      src: item.src ? item.src.substring(0, 50) + '...' : 'NO SRC',
    });
  });

  // Helper function to create a sequence component for a single item
  const createSequenceForItem = (item: TimelineItem, index: number) => {
    // Calculate premount time based on item type
    const getPremountFrames = (itemType: MediaType) => {
      switch (itemType) {
        case MediaType.VIDEO:
          return 60; // 2 seconds at 30fps for videos
        case MediaType.AUDIO:
          return 30; // 1 second at 30fps for audio
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
        <TimelineItemRenderer
          item={item}
          layerIndex={index}
          fps={timelineFps}
          selectedItemId={selectedItemId}
          editingTextId={editingTextId}
          onItemSelect={onItemSelect}
          onItemUpdate={onItemUpdate}
          onTextEdit={onTextEdit}
        />
      </Sequence>
    );
  };

  // Helper function to group video items with transitions
  const groupItemsWithTransitions = (videoItems: TimelineItem[], allTransitions: Transition[]) => {
    // Sort items by start time
    const sortedItems = [...videoItems].sort((a, b) => a.startTime - b.startTime);
    const groups: Array<{ items: TimelineItem[]; transitions: Transition[] }> = [];
    
    if (sortedItems.length === 0) return groups;

    let currentGroup = { items: [sortedItems[0]], transitions: [] as Transition[] };
    
    for (let i = 1; i < sortedItems.length; i++) {
      const currentItem = sortedItems[i];
      const previousItem = sortedItems[i - 1];
      
      // Find transition between previous and current item
      const transition = allTransitions.find(t => 
        t.fromItemId === previousItem.id && t.toItemId === currentItem.id
      );
      
      if (transition) {
        // Add transition and continue group
        currentGroup.transitions.push(transition);
        currentGroup.items.push(currentItem);
      } else {
        // No transition, start new group
        groups.push(currentGroup);
        currentGroup = { items: [currentItem], transitions: [] };
      }
    }
    
    // Don't forget the last group
    groups.push(currentGroup);
    
    return groups;
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

  // Separate video and non-video items
  const videoItems = items.filter(item => item.type === MediaType.VIDEO);
  const nonVideoItems = items.filter(item => item.type !== MediaType.VIDEO);

  // Group video items by track and then by transitions
  const videoItemsByTrack = videoItems.reduce((acc, item) => {
    if (!acc[item.trackId]) acc[item.trackId] = [];
    acc[item.trackId].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  // Get the highest priority track for videos (Track 1 > Track 2, etc.)
  const highestPriorityTrackId = Object.keys(videoItemsByTrack)
    .sort((a, b) => getTrackPriority(b) - getTrackPriority(a))[0];

  const primaryVideoItems = highestPriorityTrackId ? videoItemsByTrack[highestPriorityTrackId] : [];
  const primaryTrackTransitions = transitions.filter(t => t.trackId === highestPriorityTrackId);

  // Group primary video items with their transitions
  const videoGroups = groupItemsWithTransitions(primaryVideoItems, primaryTrackTransitions);

  // Filter active non-video items
  const activeNonVideoItems = nonVideoItems.filter(item => 
    currentFrame >= item.startTime && currentFrame < item.startTime + item.duration
  );

  // Sort non-video items for proper layering
  const sortedNonVideoItems = activeNonVideoItems.sort((a, b) => {
    const trackPriorityA = getTrackPriority(a.trackId);
    const trackPriorityB = getTrackPriority(b.trackId);
    if (trackPriorityA !== trackPriorityB) {
      return trackPriorityA - trackPriorityB;
    }
    
    const typeA = getMediaTypePriority(a.type);
    const typeB = getMediaTypePriority(b.type);
    if (typeA !== typeB) {
      return typeA - typeB;
    }
    
    return a.startTime - b.startTime;
  });

  // Sort outlines to render selected items on top
  const displaySelectedItemOnTop = (items: TimelineItem[]) => {
    const selectedItems = items.filter(item => item.id === selectedItemId);
    const unselectedItems = items.filter(item => item.id !== selectedItemId);
    return [...unselectedItems, ...selectedItems];
  };

  const sortedOutlines = displaySelectedItemOnTop(sortedNonVideoItems.filter(item => item.type === MediaType.TEXT));
  const isDragging = sortedNonVideoItems.some(item => item.properties?.isDragging);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
      }}
      onPointerDown={(e) => {
        // Only handle canvas clicks if no other element handles it
        if (e.target === e.currentTarget && e.button === 0) {
          onCanvasClick?.();
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

      {/* Layer container with hidden overflow */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {/* Render video groups with transitions */}
        {videoGroups.map((group, groupIndex) => {
          if (group.transitions.length === 0) {
            // Single video item without transitions
            return group.items.map((item, index) => createSequenceForItem(item, index));
          } else {
            // Video group with transitions
            const groupStartTime = Math.min(...group.items.map(item => item.startTime));
            const groupDuration = Math.max(...group.items.map(item => item.startTime + item.duration)) - groupStartTime;
            
            return (
              <Sequence
                key={`group-${groupIndex}`}
                from={groupStartTime}
                durationInFrames={groupDuration}
                layout="none"
              >
                <TransitionSeries>
                  {group.items.map((item, itemIndex) => {
                    // Calculate relative timing within the group
                    const relativeStartTime = item.startTime - groupStartTime;
                    
                    return (
                      <TransitionSeries.Sequence
                        key={item.id}
                        durationInFrames={item.duration}
                      >
                        <TimelineItemRenderer
                          item={item}
                          layerIndex={itemIndex}
                          fps={timelineFps}
                          selectedItemId={selectedItemId}
                          editingTextId={editingTextId}
                          onItemSelect={onItemSelect}
                          onItemUpdate={onItemUpdate}
                          onTextEdit={onTextEdit}
                        />
                      </TransitionSeries.Sequence>
                    );
                  })}
                  
                  {/* Add transitions between sequences */}
                  {group.transitions.map((transition) => {
                    // Get the appropriate transition effect
                    const getTransitionEffect = (effectType: string) => {
                      switch (effectType) {
                        case 'fade':
                        default:
                          return fade();
                      }
                    };

                    return (
                      <TransitionSeries.Transition
                        key={transition.id}
                        presentation={getTransitionEffect(transition.effect)}
                        timing={springTiming({ config: { damping: 20 } })}
                      />
                    );
                  })}
                </TransitionSeries>
              </Sequence>
            );
          }
        })}

        {/* Render non-video items normally */}
        {sortedNonVideoItems.map((item, index) => createSequenceForItem(item, index + 1000))}
      </AbsoluteFill>

      {/* Selection outlines (with overflow visible) */}
      {sortedOutlines.map((item) => (
        <Sequence
          key={`outline-${item.id}`}
          from={item.startTime}
          durationInFrames={item.duration}
          layout="none"
        >
          <TextSelectionOutline
            item={item}
            onUpdate={(updates) => onItemUpdate?.(item.id, updates)}
            onSelect={() => onItemSelect?.(item.id)}
            isSelected={selectedItemId === item.id}
            isDragging={isDragging}
            onStartEdit={() => onTextEdit?.(item.id)}
            isEditing={editingTextId === item.id}
          />
        </Sequence>
      ))}

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
            Video Groups: {videoGroups.length}
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            Active Transitions: {primaryTrackTransitions.length}
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            Non-Video Items: {sortedNonVideoItems.length}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}