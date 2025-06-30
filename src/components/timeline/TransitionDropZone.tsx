"use client";

import React, { useState } from 'react';
import { useTimeline } from './TimelineContext';
import { useDrag } from './DragContext';
import { TimelineItem } from '../../../types/timeline';

interface TransitionDropZoneProps {
  fromItem: TimelineItem;
  toItem: TimelineItem;
  trackId: string;
}

export function TransitionDropZone({ fromItem, toItem, trackId }: TransitionDropZoneProps) {
  const { state, actions } = useTimeline();
  const { isTransitionDragging } = useDrag();
  const [isDragOver, setIsDragOver] = useState(false);

  const pixelsPerFrame = state.zoom;
  const gapStart = fromItem.startTime + fromItem.duration;
  const gapEnd = toItem.startTime;
  const gapWidth = (gapEnd - gapStart) * pixelsPerFrame;
  
  // Always show a minimal drop zone for transitions, even if clips are adjacent
  const minDropZoneWidth = Math.max(gapWidth, 8); // Minimum 8px for adjacent clips


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only accept transition drags
    if (e.dataTransfer.types.includes('application/json') && isTransitionDragging) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      const dropData = JSON.parse(data);
      
      if (dropData.type === 'transition-item') {
        const transition = dropData.item;
        
        // Calculate transition position - center it in the gap
        const transitionPosition = gapStart + (gapEnd - gapStart) / 2 - transition.duration / 2;
        
        // Add the transition
        actions.addTransition({
          type: transition.id,
          name: transition.name,
          duration: transition.duration,
          fromItemId: fromItem.id,
          toItemId: toItem.id,
          trackId: trackId,
          effect: transition.effect,
          position: transitionPosition,
        });
        
        console.log(`Added ${transition.name} transition between clips`);
      }
    } catch (error) {
      console.error('Failed to handle transition drop:', error);
    }
  };

  return (
    <div
      className={`
        absolute top-0 bottom-0 transition-all duration-150 z-20
        ${isDragOver 
          ? 'bg-blue-400/40 border-l-2 border-r-2 border-blue-400' 
          : isTransitionDragging 
            ? 'bg-blue-400/10 border-l border-r border-blue-400/30' 
            : 'bg-transparent'
        }
      `}
      style={{
        left: gapStart * pixelsPerFrame - (gapWidth < 8 ? 4 : 0), // Center on adjacent clips
        width: minDropZoneWidth,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual indicator when dragging transitions */}
      {isTransitionDragging && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`
            h-6 rounded-full transition-all duration-150 flex items-center justify-center
            ${isDragOver 
              ? 'bg-blue-400 text-white px-3 min-w-20' 
              : 'bg-blue-400/30 w-1'
            }
          `}>
            {isDragOver && (
              <span className="text-xs font-medium whitespace-nowrap">
                Drop Here
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pulsing indicator for active drop zone */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-400/20 animate-pulse" />
      )}
    </div>
  );
}