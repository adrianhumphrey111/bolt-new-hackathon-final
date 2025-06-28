"use client";

import React, { useCallback, useMemo } from 'react';
import { TimelineItem } from '../../types/timeline';

// Note: useCurrentScale is only available inside Remotion context, not in our setup
// We'll use a basic implementation for now

const HANDLE_SIZE = 8;

export const ResizeHandle: React.FC<{
  type: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onUpdate: (updates: Partial<TimelineItem>) => void;
  item: TimelineItem;
}> = ({ type, onUpdate, item }) => {
  const scale = 1; // For now, we'll use 1:1 scale - can be enhanced later
  const size = Math.round(HANDLE_SIZE / scale);
  const borderSize = 1 / scale;

  // Get current properties with defaults
  const x = item.properties?.x || 50;
  const y = item.properties?.y || 50;
  const width = item.properties?.width || 300;
  const height = item.properties?.height || 100;

  const sizeStyle: React.CSSProperties = useMemo(() => {
    return {
      position: 'absolute',
      height: size,
      width: size,
      backgroundColor: 'white',
      border: `${borderSize}px solid #0B84F3`,
    };
  }, [borderSize, size]);

  const margin = -size / 2 - borderSize;

  const style: React.CSSProperties = useMemo(() => {
    if (type === 'top-left') {
      return {
        ...sizeStyle,
        marginLeft: margin,
        marginTop: margin,
        cursor: 'nwse-resize',
      };
    }

    if (type === 'top-right') {
      return {
        ...sizeStyle,
        marginTop: margin,
        marginRight: margin,
        right: 0,
        cursor: 'nesw-resize',
      };
    }

    if (type === 'bottom-left') {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginLeft: margin,
        bottom: 0,
        cursor: 'nesw-resize',
      };
    }

    if (type === 'bottom-right') {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginRight: margin,
        right: 0,
        bottom: 0,
        cursor: 'nwse-resize',
      };
    }

    throw new Error('Unknown type: ' + JSON.stringify(type));
  }, [margin, sizeStyle, type]);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) {
        return;
      }

      const initialX = e.clientX;
      const initialY = e.clientY;
      const initialWidth = width;
      const initialHeight = height;
      const initialX_pos = x;
      const initialY_pos = y;

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;

        const isLeft = type === 'top-left' || type === 'bottom-left';
        const isTop = type === 'top-left' || type === 'top-right';

        const newWidth = initialWidth + (isLeft ? -offsetX : offsetX);
        const newHeight = initialHeight + (isTop ? -offsetY : offsetY);
        const newLeft = initialX_pos + (isLeft ? offsetX : 0);
        const newTop = initialY_pos + (isTop ? offsetY : 0);

        // Calculate new font size proportional to width change
        const currentFontSize = item.properties?.fontSize || 48;
        const widthRatio = Math.max(newWidth, 50) / initialWidth;
        const newFontSize = Math.max(12, Math.round(currentFontSize * widthRatio));

        onUpdate({
          properties: {
            ...item.properties,
            width: Math.max(50, Math.round(newWidth)),
            height: Math.max(30, Math.round(newHeight)),
            x: Math.max(0, Math.round(newLeft)),
            y: Math.max(0, Math.round(newTop)),
            fontSize: newFontSize,
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
    [item, scale, onUpdate, type, x, y, width, height],
  );

  return <div onPointerDown={onPointerDown} style={style} />;
};