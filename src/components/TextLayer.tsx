"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { TimelineItem } from '../../types/timeline';

export const TextLayer: React.FC<{
  item: TimelineItem;
  isEditing: boolean;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}> = ({ item, isEditing, onSave, onCancel }) => {
  const [editValue, setEditValue] = useState(item.content || item.name || '');

  // Get current properties with defaults
  const x = item.properties?.x || 50;
  const y = item.properties?.y || 50;
  const width = item.properties?.width || 300;
  const height = item.properties?.height || 100;
  const fontSize = item.properties?.fontSize || 48;
  const color = item.properties?.color || 'white';
  const fontFamily = item.properties?.fontFamily || 'Arial, sans-serif';
  const fontWeight = item.properties?.fontWeight || 'bold';
  const textAlign = item.properties?.textAlign || 'center';

  const style: React.CSSProperties = useMemo(() => {
    return {
      position: 'absolute',
      left: x,
      top: y,
      width: width,
      height: height,
      color: color,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      textAlign: textAlign as any,
      display: 'flex',
      alignItems: 'center',
      justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
      padding: '8px 12px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      pointerEvents: 'none', // This layer doesn't handle events - that's done by the outline
    };
  }, [x, y, width, height, color, fontSize, fontFamily, fontWeight, textAlign]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [editValue, onSave, onCancel]);

  const handleBlur = useCallback(() => {
    onSave(editValue);
  }, [editValue, onSave]);

  // Update editValue when item content changes
  React.useEffect(() => {
    setEditValue(item.content || item.name || '');
  }, [item.content, item.name]);

  if (isEditing) {
    return (
      <div style={style}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid #0B84F3',
            borderRadius: '4px',
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            textAlign: 'inherit',
            padding: '8px 12px',
            outline: 'none',
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
          }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div style={style}>
      {item.content || item.name}
    </div>
  );
};