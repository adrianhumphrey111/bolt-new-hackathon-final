import React from 'react';
import { useCurrentFrame, useVideoConfig, Img, Video, Audio, Sequence, AbsoluteFill } from 'remotion';
import { TimelineItem, MediaType } from '../../types/timeline';
import { TextLayer } from '../components/TextLayer';
import { TextSelectionOutline } from '../components/TextSelectionOutline';

interface TimelineCompositionProps {
  items: TimelineItem[];
  fps: number;
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
  selectedItemId?: string;
  editingTextId?: string;
  onItemSelect?: (itemId: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<TimelineItem>) => void;
  onTextEdit?: (itemId: string) => void;
}

function TimelineItemRenderer({ 
  item, 
  layerIndex, 
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
      return (
        <Video
          src={item.src}
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

export function TimelineComposition({ 
  items, 
  selectedItemId,
  editingTextId, 
  onItemSelect,
  onItemUpdate,
  onTextEdit, 
  onCanvasClick 
}: TimelineCompositionProps) {
  const { width, height } = useVideoConfig();
  const currentFrame = useCurrentFrame();

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

  // Filter items that are active at current frame
  const activeItems = items.filter(item => 
    currentFrame >= item.startTime && currentFrame < item.startTime + item.duration
  );

  // For videos specifically, only keep the highest priority video
  const activeVideos = activeItems.filter(item => item.type === MediaType.VIDEO);
  const highestPriorityVideo = activeVideos.reduce((highest, current) => {
    if (!highest) return current;
    const currentPriority = getTrackPriority(current.trackId);
    const highestPriority = getTrackPriority(highest.trackId);
    return currentPriority > highestPriority ? current : highest;
  }, null as TimelineItem | null);

  // Create filtered list: non-video items + only the highest priority video
  const filteredItems = [
    ...activeItems.filter(item => item.type !== MediaType.VIDEO),
    ...(highestPriorityVideo ? [highestPriorityVideo] : [])
  ];

  // Sort items for proper layering (items later in array render on top)
  const sortedItems = filteredItems.sort((a, b) => {
    // First sort by track priority (Track 1 > Track 2)
    const trackPriorityA = getTrackPriority(a.trackId);
    const trackPriorityB = getTrackPriority(b.trackId);
    if (trackPriorityA !== trackPriorityB) {
      return trackPriorityA - trackPriorityB; // Higher priority renders later (on top)
    }
    
    // Then sort by media type priority within same track
    const typeA = getMediaTypePriority(a.type);
    const typeB = getMediaTypePriority(b.type);
    if (typeA !== typeB) {
      return typeA - typeB; // Lower priority renders first (behind)
    }
    
    // Finally sort by start time within same track and type
    return a.startTime - b.startTime;
  });

  // Sort outlines to render selected items on top
  const displaySelectedItemOnTop = (items: TimelineItem[]) => {
    const selectedItems = items.filter(item => item.id === selectedItemId);
    const unselectedItems = items.filter(item => item.id !== selectedItemId);
    return [...unselectedItems, ...selectedItems];
  };

  const sortedOutlines = displaySelectedItemOnTop(sortedItems.filter(item => item.type === MediaType.TEXT));
  const isDragging = sortedItems.some(item => item.properties?.isDragging);

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

      {/* Layer container with hidden overflow (like Remotion example) */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sortedItems.map((item, index) => (
          <Sequence
            key={item.id}
            from={item.startTime}
            durationInFrames={item.duration}
            layout="none"
          >
            <TimelineItemRenderer
              item={item}
              layerIndex={index}
              selectedItemId={selectedItemId}
              editingTextId={editingTextId}
              onItemSelect={onItemSelect}
              onItemUpdate={onItemUpdate}
              onTextEdit={onTextEdit}
            />
          </Sequence>
        ))}
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
            Active Video: {highestPriorityVideo ? 
              `${highestPriorityVideo.trackId.replace(/^[^-]+-/, '')} (${highestPriorityVideo.name})` : 
              'None'}
          </div>
          <div style={{ marginTop: 4, fontSize: 10 }}>
            Layer Order (bottom → top):
            {sortedItems.map((item, index) => (
              <div key={item.id} style={{ marginLeft: 8 }}>
                {index}: {item.type} on {item.trackId.replace(/^[^-]+-/, '')}
                {item.type === MediaType.VIDEO ? ' ★' : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}