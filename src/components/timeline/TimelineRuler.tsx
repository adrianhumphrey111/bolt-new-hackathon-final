"use client";

import React from 'react';
import { useTimeline } from './TimelineContext';

export function TimelineRuler() {
  const { state, config } = useTimeline();
  const { totalDuration, zoom, fps } = state;
  const { rulerHeight } = config;

  const pixelsPerFrame = zoom;
  const totalWidth = totalDuration * pixelsPerFrame;
  
  // Calculate adaptive tick intervals based on zoom level
  const getTickIntervals = () => {
    const pixelsPerSecond = fps * pixelsPerFrame;
    
    // Adaptive scaling based on zoom level
    if (pixelsPerSecond >= 120) {
      // Very zoomed in - show frames and quarter seconds
      return {
        majorTickInterval: fps / 4, // Quarter second
        minorTickInterval: fps / 12, // Every 2-3 frames at 30fps
        labelInterval: fps, // Label every second
      };
    } else if (pixelsPerSecond >= 60) {
      // Medium zoom - show seconds and half seconds
      return {
        majorTickInterval: fps, // Every second
        minorTickInterval: fps / 2, // Half second
        labelInterval: fps, // Label every second
      };
    } else if (pixelsPerSecond >= 30) {
      // Normal zoom - show seconds and major markers
      return {
        majorTickInterval: fps, // Every second
        minorTickInterval: fps * 5, // Every 5 seconds
        labelInterval: fps, // Label every second
      };
    } else if (pixelsPerSecond >= 15) {
      // Zoomed out - show 5 second intervals
      return {
        majorTickInterval: fps * 5, // Every 5 seconds
        minorTickInterval: fps * 10, // Every 10 seconds
        labelInterval: fps * 5, // Label every 5 seconds
      };
    } else {
      // Very zoomed out - show 10+ second intervals
      return {
        majorTickInterval: fps * 10, // Every 10 seconds
        minorTickInterval: fps * 30, // Every 30 seconds
        labelInterval: fps * 10, // Label every 10 seconds
      };
    }
  };

  const { majorTickInterval, minorTickInterval, labelInterval } = getTickIntervals();

  const majorTicks = [];
  const minorTicks = [];
  const labels = [];

  // Generate major ticks
  for (let frame = 0; frame <= totalDuration; frame += majorTickInterval) {
    majorTicks.push({
      frame,
      x: frame * pixelsPerFrame,
    });
  }

  // Generate minor ticks (only if zoom level allows)
  if (minorTickInterval < majorTickInterval) {
    for (let frame = 0; frame <= totalDuration; frame += minorTickInterval) {
      if (frame % majorTickInterval !== 0) {
        minorTicks.push({
          frame,
          x: frame * pixelsPerFrame,
        });
      }
    }
  }

  // Generate labels (separate from ticks for better control)
  for (let frame = 0; frame <= totalDuration; frame += labelInterval) {
    const seconds = Math.floor(frame / fps);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeLabel = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    labels.push({
      frame,
      x: frame * pixelsPerFrame,
      label: timeLabel,
    });
  }

  const trackHeaderWidth = 128; // Same as track header width (w-32)

  return (
    <div 
      className="relative bg-gray-800 border-b border-gray-600" 
      style={{ height: rulerHeight, width: totalWidth }}
      data-timeline-ruler
    >
      {/* Track header spacer */}
      <div 
        className="absolute left-0 top-0 bottom-0 bg-gray-700 border-r border-gray-600"
        style={{ width: trackHeaderWidth }}
      />
      
      {/* Timeline ruler content */}
      <div className="relative" style={{ marginLeft: trackHeaderWidth }}>
        {/* Major ticks */}
        {majorTicks.map(tick => (
          <div 
            key={`major-${tick.frame}`} 
            className="absolute w-px h-6 bg-gray-400"
            style={{ left: tick.x }}
          />
        ))}
        
        {/* Minor ticks */}
        {minorTicks.map(tick => (
          <div 
            key={`minor-${tick.frame}`} 
            className="absolute w-px h-3 bg-gray-500"
            style={{ left: tick.x, top: rulerHeight - 12 }}
          />
        ))}

        {/* Time labels */}
        {labels.map(label => (
          <div 
            key={`label-${label.frame}`} 
            className="absolute text-xs text-gray-300 whitespace-nowrap"
            style={{ 
              left: label.x + 2, 
              top: 2,
              // Prevent overlapping labels at high zoom
              display: label.x > -20 ? 'block' : 'none'
            }}
          >
            {label.label}
          </div>
        ))}
        
        {/* Timeline info indicator */}
        <div className="absolute bottom-0 left-0 text-xs text-gray-400 px-2">
          {Math.round(zoom * 100)}% • {Math.round(totalDuration / fps)}s ({totalDuration} frames)
        </div>
      </div>
    </div>
  );
}