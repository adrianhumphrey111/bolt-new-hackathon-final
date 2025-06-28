"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { TimelineItem } from '../../types/timeline';
import { ResizeHandle } from './ResizeHandle';

export const TextSelectionOutline: React.FC<{
  item: TimelineItem;
  onUpdate: (updates: Partial<TimelineItem>) => void;
  onSelect: () => void;
  isSelected: boolean;
  isDragging: boolean;
  onStartEdit: () => void;
  isEditing: boolean;
}> = ({
  item,
  onUpdate,
  onSelect,
  isSelected,
  isDragging,
  onStartEdit,
  isEditing,
}) => {
  const scale = 1; // For now, using 1:1 scale
  const scaledBorder = Math.ceil(2 / scale);
  const [hovered, setHovered] = useState(false);

  // Get current properties with defaults
  const x = item.properties?.x || 50;
  const y = item.properties?.y || 50;
  const width = item.properties?.width || 300;
  const height = item.properties?.height || 100;

  const onMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const style: React.CSSProperties = useMemo(() => {
    return {
      width: width,
      height: height,
      left: x,
      top: y,
      position: 'absolute',
      outline:
        (hovered && !isDragging) || isSelected
          ? `${scaledBorder}px solid #0B84F3`
          : undefined,
      userSelect: 'none',
      touchAction: 'none',
      background: isSelected ? 'rgba(11, 132, 243, 0.1)' : 'transparent',
      cursor: isDragging ? 'grabbing' : 'grab',
    };
  }, [width, height, x, y, hovered, isDragging, isSelected, scaledBorder]);

  const startDragging = useCallback(
    (e: PointerEvent | React.MouseEvent) => {
      const initialX = e.clientX;
      const initialY = e.clientY;

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
        
        onUpdate({
          properties: {
            ...item.properties,
            x: Math.max(0, Math.round(x + offsetX)),
            y: Math.max(0, Math.round(y + offsetY)),
          },
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, {
        once: true,
      });
    },
    [x, y, scale, onUpdate, item.properties],
  );

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) {
        return;
      }

      onSelect();
      startDragging(e);
    },
    [onSelect, startDragging],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStartEdit();
    },
    [onStartEdit],
  );

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={onMouseEnter}
      onPointerLeave={onMouseLeave}
      onDoubleClick={onDoubleClick}
      style={style}
    >
      {isSelected && !isEditing ? (
        <>
          <ResizeHandle item={item} onUpdate={onUpdate} type="top-left" />
          <ResizeHandle item={item} onUpdate={onUpdate} type="top-right" />
          <ResizeHandle item={item} onUpdate={onUpdate} type="bottom-left" />
          <ResizeHandle item={item} onUpdate={onUpdate} type="bottom-right" />
          
          {/* Edit indicator */}
          <div
            style={{
              position: 'absolute',
              top: -20 / scale,
              left: 0,
              fontSize: 12 / scale,
              color: '#0B84F3',
              background: 'rgba(0, 0, 0, 0.8)',
              padding: `${2 / scale}px ${6 / scale}px`,
              borderRadius: 3 / scale,
              whiteSpace: 'nowrap',
            }}
          >
            Double-click to edit
          </div>
        </>
      ) : null}
    </div>
  );
};