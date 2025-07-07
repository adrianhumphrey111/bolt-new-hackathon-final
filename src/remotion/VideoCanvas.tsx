import React, { useCallback, useMemo } from 'react';
import { Video, Img, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaType, TimelineItem } from '../../types/timeline';
import { TextLayer } from '../components/TextLayer';

interface VideoCanvasProps {
  item: TimelineItem;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  isAiSelected?: boolean;
  onSelect: (itemId: string) => void;
  onUpdate: (itemId: string, properties: any) => void;
  onAiToggle?: (itemId: string) => void;
  scale: number;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  item,
  canvasWidth,
  canvasHeight,
  isSelected,
  isAiSelected = false,
  onSelect,
  onUpdate,
  onAiToggle,
  scale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate actual dimensions and position - ensure numbers and fix NaN values
  const x = Number(item.properties?.x) || 0;
  const y = Number(item.properties?.y) || 0;
  
  // Handle width/height with proper NaN checking
  const rawWidth = item.properties?.width;
  const rawHeight = item.properties?.height;
  const width = (rawWidth && !isNaN(Number(rawWidth)) && Number(rawWidth) > 0) ? Number(rawWidth) : canvasWidth;
  const height = (rawHeight && !isNaN(Number(rawHeight)) && Number(rawHeight) > 0) ? Number(rawHeight) : canvasHeight;
  
  const rotation = Number(item.properties?.rotation) || 0;
  const itemScale = Number(item.properties?.scale) || 1;
  const opacity = Number(item.properties?.opacity) || 1;

  // Debug logging (removed for performance during playback)

  // Container style for the draggable/resizable wrapper
  const containerStyle: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    transformOrigin: 'center center',
    cursor: isSelected ? 'move' : 'pointer',
    boxSizing: 'border-box',
  }), [x, y, width, height, isSelected]);

  // Video content style (with rotation applied to the video itself)
  const videoContentStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100%',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  }), [rotation]);

  // Selection outline style (separate from video, no rotation)
  const selectionOutlineStyle: React.CSSProperties = useMemo(() => {
    let borderColor = 'none';
    let borderStyle = 'none';
    
    if (isSelected) {
      borderColor = '#0B84F3'; // Blue for regular selection
      borderStyle = '2px solid';
    } else if (isAiSelected) {
      borderColor = '#10B981'; // Green for AI selection
      borderStyle = '2px dashed';
    }
    
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      border: borderStyle === 'none' ? 'none' : `${borderStyle} ${borderColor}`,
      boxSizing: 'border-box',
      pointerEvents: 'none',
      zIndex: 1000,
    };
  }, [isSelected, isAiSelected]);

  // Media content style - fill the container completely
  const mediaStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const, // Changed from 'contain' to 'cover' to fill the container
    transform: `scale(${itemScale})`,
    opacity,
    pointerEvents: 'none' as const,
  }), [itemScale, opacity]);

  // Handle drag start and AI selection
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Check for AI selection modifier (Ctrl/Cmd key)
    if ((e.ctrlKey || e.metaKey) && onAiToggle) {
      e.preventDefault();
      e.stopPropagation();
      onAiToggle(item.id);
      return;
    }
    
    if (!isSelected) {
      onSelect(item.id);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = x;
    const initialY = y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      // Constrain position within canvas bounds with some tolerance for rotated videos
      const margin = 100; // Allow some movement outside canvas for rotated videos
      const newX = Math.max(-margin, Math.min(initialX + deltaX, canvasWidth + margin));
      const newY = Math.max(-margin, Math.min(initialY + deltaY, canvasHeight + margin));

      onUpdate(item.id, {
        properties: {
          ...item.properties,
          x: Math.round(newX),
          y: Math.round(newY),
        }
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isSelected, onSelect, item, x, y, width, height, scale, canvasWidth, canvasHeight, onUpdate]);

  // Render resize handles
  const renderResizeHandles = () => {
    if (!isSelected) return null;

    const handleSize = Math.max(12, 12 / scale); // Made bigger
    const handleStyle = (position: string): React.CSSProperties => ({
      position: 'absolute',
      width: handleSize,
      height: handleSize,
      backgroundColor: '#0B84F3',
      border: `2px solid white`, // Fixed border width
      boxSizing: 'border-box',
      borderRadius: '2px', // Added slight rounding
      cursor: position.includes('top') && position.includes('left') ? 'nw-resize' :
              position.includes('top') && position.includes('right') ? 'ne-resize' :
              position.includes('bottom') && position.includes('left') ? 'sw-resize' : 'se-resize',
      zIndex: 1000, // Ensure they're on top
    });

    const createResizeHandler = (corner: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const initialWidth = width;
      const initialHeight = height;
      const initialX = x;
      const initialY = y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;

        let newWidth = initialWidth;
        let newHeight = initialHeight;
        let newX = initialX;
        let newY = initialY;

        if (corner.includes('right')) {
          newWidth = Math.max(50, initialWidth + deltaX);
        } else if (corner.includes('left')) {
          newWidth = Math.max(50, initialWidth - deltaX);
          newX = initialX + (initialWidth - newWidth);
        }

        if (corner.includes('bottom')) {
          newHeight = Math.max(50, initialHeight + deltaY);
        } else if (corner.includes('top')) {
          newHeight = Math.max(50, initialHeight - deltaY);
          newY = initialY + (initialHeight - newHeight);
        }

        // Constrain to canvas bounds with some flexibility
        const margin = 100;
        newX = Math.max(-margin, Math.min(newX, canvasWidth + margin));
        newY = Math.max(-margin, Math.min(newY, canvasHeight + margin));
        newWidth = Math.min(newWidth, canvasWidth + margin * 2);
        newHeight = Math.min(newHeight, canvasHeight + margin * 2);

        onUpdate(item.id, {
          properties: {
            ...item.properties,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          }
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <>
        <div
          style={{ ...handleStyle('top-left'), top: -handleSize/2, left: -handleSize/2 }}
          onMouseDown={createResizeHandler('top-left')}
        />
        <div
          style={{ ...handleStyle('top-right'), top: -handleSize/2, right: -handleSize/2 }}
          onMouseDown={createResizeHandler('top-right')}
        />
        <div
          style={{ ...handleStyle('bottom-left'), bottom: -handleSize/2, left: -handleSize/2 }}
          onMouseDown={createResizeHandler('bottom-left')}
        />
        <div
          style={{ ...handleStyle('bottom-right'), bottom: -handleSize/2, right: -handleSize/2 }}
          onMouseDown={createResizeHandler('bottom-right')}
        />
      </>
    );
  };

  // Render media content based on type
  const renderMedia = () => {
    switch (item.type) {
      case MediaType.VIDEO:
        if (!item.src) return null;
        
        const startFrom = Math.round((item.properties?.originalStartTime || 0) * fps);
        const endAt = item.properties?.originalEndTime 
          ? Math.round(item.properties.originalEndTime * fps) 
          : undefined;
        
        return (
          <div style={videoContentStyle}>
            <Video
              src={item.src}
              style={mediaStyle}
              startFrom={startFrom}
              endAt={endAt}
              pauseWhenBuffering
              volume={1}
              muted={false}
            />
          </div>
        );

      case MediaType.IMAGE:
        if (!item.src) return null;
        return <Img src={item.src} style={mediaStyle} />;

      case MediaType.AUDIO:
        if (!item.src) return null;
        const audioStart = Math.round((item.properties?.originalStartTime || 0) * fps);
        const audioEnd = item.properties?.originalEndTime 
          ? Math.round(item.properties.originalEndTime * fps) 
          : undefined;
        
        return (
          <Audio
            src={item.src}
            startFrom={audioStart}
            endAt={audioEnd}
            volume={1}
          />
        );

      case MediaType.TEXT:
        return (
          <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <TextLayer
              item={item}
              isEditing={false}
              onSave={() => {}}
              onCancel={() => {}}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={containerStyle}
      onMouseDown={handleDragStart}
    >
      {renderMedia()}
      {/* Selection outline - separate from media content */}
      <div style={selectionOutlineStyle} />
      {renderResizeHandles()}
    </div>
  );
};