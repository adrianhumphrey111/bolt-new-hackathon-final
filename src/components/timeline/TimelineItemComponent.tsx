"use client";

import React, { useRef, useState, useCallback } from 'react';
import { TimelineItem, MediaType } from '../../../types/timeline';
import { useTimeline } from './TimelineContext';
import { ContextMenu } from './ContextMenu';

interface TimelineItemProps {
  item: TimelineItem;
  trackHeight: number;
}

export function TimelineItemComponent({ item, trackHeight }: TimelineItemProps) {
  const { state, actions, config } = useTimeline();
  const { zoom, selectedItems, tracks } = state;
  const { snapThreshold } = config;
  
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const pixelsPerFrame = zoom;
  const width = item.duration * pixelsPerFrame;
  const x = item.startTime * pixelsPerFrame;
  const isSelected = selectedItems.includes(item.id);

  const getItemColor = (type: MediaType) => {
    switch (type) {
      case MediaType.VIDEO:
        return 'bg-blue-500';
      case MediaType.AUDIO:
        return 'bg-green-500';
      case MediaType.IMAGE:
        return 'bg-purple-500';
      case MediaType.TEXT:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSnapPosition = (frame: number) => {
    // Snap to other items
    for (const track of tracks) {
      for (const otherItem of track.items) {
        if (otherItem.id === item.id) continue;
        
        const snapPoints = [
          otherItem.startTime,
          otherItem.startTime + otherItem.duration,
        ];
        
        for (const snapPoint of snapPoints) {
          if (Math.abs(frame - snapPoint) <= snapThreshold) {
            return snapPoint;
          }
        }
      }
    }
    
    // Snap to grid (every second)
    const secondInFrames = state.fps;
    const nearestSecond = Math.round(frame / secondInFrames) * secondInFrames;
    if (Math.abs(frame - nearestSecond) <= snapThreshold) {
      return nearestSecond;
    }
    
    return frame;
  };

  // Note: findTrackAtY functionality is now integrated directly in mouse handlers

  // Note: Overlap checking is now handled in the context reducer

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only start dragging on left mouse button
    if (e.button !== 0) return;
    
    // Select the item if not already selected
    if (!isSelected) {
      actions.selectItems([item.id]);
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosition = { trackId: item.trackId, startTime: item.startTime };
    
    let hasMoved = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!itemRef.current) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Start dragging after moving at least 5 pixels
      if (!hasMoved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        hasMoved = true;
        setIsDragging(true);
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
        
        // Add visual feedback
        itemRef.current.style.zIndex = '1000';
        itemRef.current.style.opacity = '0.8';
        itemRef.current.style.cursor = 'grabbing';
      }
      
      if (hasMoved) {
        // Update visual position
        itemRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Highlight potential drop zones
        const tracks = document.querySelectorAll('[data-track-id]');
        tracks.forEach(track => {
          const rect = track.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            track.classList.add('bg-blue-500/20');
          } else {
            track.classList.remove('bg-blue-500/20');
          }
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      document.body.style.userSelect = ''; // Restore text selection
      
      if (itemRef.current && hasMoved) {
        const deltaX = e.clientX - startX;
        
        // Calculate new time position
        const frameDelta = Math.round(deltaX / pixelsPerFrame);
        let newStartTime = Math.max(0, startPosition.startTime + frameDelta);
        newStartTime = getSnapPosition(newStartTime);
        
        // Find target track
        let targetTrackId = startPosition.trackId;
        const tracks = document.querySelectorAll('[data-track-id]');
        
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          const rect = track.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const trackId = track.getAttribute('data-track-id');
            if (trackId) {
              targetTrackId = trackId;
              break;
            }
          }
        }
        
        // Reset visual state
        itemRef.current.style.transform = '';
        itemRef.current.style.zIndex = '';
        itemRef.current.style.opacity = '';
        itemRef.current.style.cursor = 'grab';
        
        // Clear visual feedback
        tracks.forEach(track => {
          track.classList.remove('bg-blue-500/20');
        });
        
        // Update position if it changed
        if (targetTrackId !== startPosition.trackId || newStartTime !== startPosition.startTime) {
          console.log('🎬 Moving item:', {
            itemId: item.id,
            itemName: item.name,
            from: { trackId: startPosition.trackId, startTime: startPosition.startTime },
            to: { trackId: targetTrackId, startTime: newStartTime },
            deltaFrames: frameDelta
          });
          actions.moveItem(item.id, targetTrackId, newStartTime);
        } else {
          console.log('🎬 Item position unchanged:', item.name);
        }
      }
      
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [item, isSelected, pixelsPerFrame, actions, getSnapPosition]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      actions.selectItems([item.id]);
    }
  }, [isDragging, item.id, actions]);

  const handleDoubleClick = useCallback(() => {
    // Split at playhead if over item
    if (state.playheadPosition > item.startTime && 
        state.playheadPosition < item.startTime + item.duration) {
      actions.splitItem(item.id, state.playheadPosition);
    }
  }, [item, state.playheadPosition, actions]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Right-clicking timeline item:', item.name);
    
    // Select the item if not already selected
    if (!isSelected) {
      actions.selectItems([item.id]);
    }
    
    // Open context menu at mouse position
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
    });
  }, [item.id, isSelected, actions]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Handle resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (e.button !== 0) return; // Only left mouse button
    
    setIsResizing(side);
    const startX = e.clientX;
    const originalStartTime = item.startTime;
    const originalDuration = item.duration;
    
    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const frameDelta = Math.round(deltaX / pixelsPerFrame);
      
      if (side === 'left') {
        // Resize from the left (trim start)
        const newStartTime = Math.max(0, originalStartTime + frameDelta);
        const maxTrim = originalDuration - 30; // Minimum 1 second (30 frames)
        const actualStartTime = Math.min(newStartTime, originalStartTime + maxTrim);
        const newDuration = originalDuration - (actualStartTime - originalStartTime);
        
        actions.updateItem(item.id, {
          startTime: actualStartTime,
          duration: Math.max(30, newDuration), // Minimum duration
        });
      } else {
        // Resize from the right (trim end)
        const newDuration = Math.max(30, originalDuration + frameDelta); // Minimum 1 second
        actions.updateItem(item.id, { duration: newDuration });
      }
    };
    
    const handleResizeEnd = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = '';
    };
    
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [item, pixelsPerFrame, actions]);

  const contextMenuItems = [
    {
      label: 'Delete',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => {
        console.log('🗑️ Deleting item:', item.name);
        actions.removeItem(item.id);
      },
      danger: true,
    },
    {
      label: 'Duplicate',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H9z" />
          <path d="M3 8a2 2 0 012-2v10c0 .55.45 1 1 1h8a2 2 0 01-2 2H5a3 3 0 01-3-3V8z" />
        </svg>
      ),
      onClick: () => {
        console.log('📋 Duplicating item:', item.name);
        // Create a duplicate item slightly offset
        actions.addItem({
          type: item.type,
          name: `${item.name} Copy`,
          startTime: item.startTime + item.duration + 10, // Small gap
          duration: item.duration,
          trackId: item.trackId,
          src: item.src,
          content: item.content,
          properties: item.properties,
        });
      },
    },
    {
      label: 'Split at Playhead',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => {
        console.log('✂️ Splitting item:', item.name);
        if (state.playheadPosition > item.startTime && 
            state.playheadPosition < item.startTime + item.duration) {
          actions.splitItem(item.id, state.playheadPosition);
        }
      },
      disabled: !(state.playheadPosition > item.startTime && 
                  state.playheadPosition < item.startTime + item.duration),
    },
    {
      label: 'Properties',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => {
        console.log('⚙️ Opening properties for:', item.name);
        // This would open a properties panel - for now just select the item
        actions.selectItems([item.id]);
      },
    },
  ];

  return (
    <div
      ref={itemRef}
      className={`
        absolute rounded border-2 cursor-grab select-none
        ${getItemColor(item.type)}
        ${isSelected ? 'border-white shadow-lg ring-2 ring-white/20' : 'border-transparent'}
        ${isDragging ? 'opacity-75 shadow-2xl' : 'opacity-90'}
        hover:opacity-100 hover:shadow-md transition-all duration-150
        hover:scale-105
      `}
      style={{
        left: x,
        width: Math.max(width, 20), // Minimum width
        height: trackHeight - 4,
        top: 2,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      data-item-id={item.id}
    >
      <div className="p-1 text-xs text-white font-medium truncate flex items-center justify-between">
        <span>{item.name}</span>
        {isDragging && (
          <span className="text-xs opacity-75">📦</span>
        )}
      </div>
      
      {/* Resize handles */}
      {isSelected && (
        <>
          <div 
            className={`absolute left-0 top-0 bottom-0 w-2 cursor-w-resize transition-colors ${
              isResizing === 'left' ? 'bg-blue-400' : 'bg-white hover:bg-blue-300'
            }`}
            onMouseDown={(e) => handleResizeStart(e, 'left')}
            title="Trim start"
          />
          <div 
            className={`absolute right-0 top-0 bottom-0 w-2 cursor-e-resize transition-colors ${
              isResizing === 'right' ? 'bg-blue-400' : 'bg-white hover:bg-blue-300'
            }`}
            onMouseDown={(e) => handleResizeStart(e, 'right')}
            title="Trim end"
          />
        </>
      )}
      
      {/* Duration indicator */}
      <div className="absolute bottom-0 right-1 text-xs text-white opacity-75">
        {Math.round(item.duration / state.fps * 10) / 10}s
      </div>

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        items={contextMenuItems}
      />
    </div>
  );
}