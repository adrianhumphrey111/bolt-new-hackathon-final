import React from 'react';
import { useCurrentFrame, useVideoConfig, Img, Video, Audio } from 'remotion';
import { TimelineItem, MediaType } from '../../types/timeline';

interface TimelineCompositionProps {
  items: TimelineItem[];
  fps: number;
}

interface TimelineItemRendererProps {
  item: TimelineItem;
  currentFrame: number;
}

function TimelineItemRenderer({ item, currentFrame }: TimelineItemRendererProps) {
  const itemStartFrame = item.startTime;
  const itemEndFrame = item.startTime + item.duration;
  
  // Don't render if current frame is outside item's time range
  if (currentFrame < itemStartFrame || currentFrame >= itemEndFrame) {
    return null;
  }

  // Calculate relative frame within the item (for future use with video timing)
  // const relativeFrame = currentFrame - itemStartFrame;
  
  // Default positioning and sizing
  const style: React.CSSProperties = {
    position: 'absolute',
    left: item.properties?.x || 0,
    top: item.properties?.y || 0,
    width: item.properties?.width || '100%',
    height: item.properties?.height || 'auto',
    transform: `scale(${item.properties?.scale || 1}) rotate(${item.properties?.rotation || 0}deg)`,
    opacity: item.properties?.opacity || 1,
  };

  switch (item.type) {
    case MediaType.VIDEO:
      if (!item.src) return null;
      return (
        <Video
          src={item.src}
          style={style}
          startFrom={0}
          endAt={item.duration}
        />
      );

    case MediaType.AUDIO:
      if (!item.src) return null;
      return (
        <Audio
          src={item.src}
          startFrom={0}
          endAt={item.duration}
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
        <div
          style={{
            ...style,
            color: item.properties?.color || 'white',
            fontSize: item.properties?.fontSize || 48,
            fontFamily: item.properties?.fontFamily || 'Arial, sans-serif',
            fontWeight: item.properties?.fontWeight || 'bold',
            textAlign: item.properties?.textAlign || 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            padding: '20px',
          }}
        >
          {item.content || item.name}
        </div>
      );

    default:
      return null;
  }
}

export function TimelineComposition({ items }: TimelineCompositionProps) {
  const currentFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Sort items by their track order and start time for proper layering
  const sortedItems = [...items].sort((a, b) => {
    // First sort by track (items on later tracks appear on top)
    const trackComparison = a.trackId.localeCompare(b.trackId);
    if (trackComparison !== 0) return trackComparison;
    
    // Then sort by start time within the same track
    return a.startTime - b.startTime;
  });

  return (
    <div
      style={{
        width,
        height,
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        position: 'relative',
        overflow: 'hidden',
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

      {/* Render all timeline items */}
      {sortedItems.map((item) => (
        <TimelineItemRenderer
          key={item.id}
          item={item}
          currentFrame={currentFrame}
        />
      ))}

      {/* Frame counter overlay (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: 'white',
            fontSize: 16,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: 4,
          }}
        >
          Frame: {currentFrame}
        </div>
      )}
    </div>
  );
}