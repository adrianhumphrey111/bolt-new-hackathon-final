"use client";

import React from 'react';
import { useTimeline } from './TimelineContext';

export function TimelineRuler() {
  const { state, config } = useTimeline();
  const { totalDuration, zoom, fps } = state;
  const { rulerHeight } = config;

  const pixelsPerFrame = zoom;
  const totalWidth = totalDuration * pixelsPerFrame;
  
  // Calculate major and minor tick intervals
  const secondsInFrames = fps;
  const majorTickInterval = secondsInFrames; // Every second
  const minorTickInterval = fps / 4; // Every quarter second

  const majorTicks = [];
  const minorTicks = [];

  for (let frame = 0; frame <= totalDuration; frame += minorTickInterval) {
    if (frame % majorTickInterval === 0) {
      const seconds = Math.floor(frame / fps);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timeLabel = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      majorTicks.push({
        frame,
        x: frame * pixelsPerFrame,
        label: timeLabel,
      });
    } else {
      minorTicks.push({
        frame,
        x: frame * pixelsPerFrame,
      });
    }
  }

  return (
    <div 
      className="relative bg-gray-800 border-b border-gray-600" 
      style={{ height: rulerHeight, width: totalWidth }}
    >
      {/* Time labels and major ticks */}
      {majorTicks.map(tick => (
        <div key={tick.frame} className="absolute" style={{ left: tick.x }}>
          <div className="w-px h-6 bg-gray-400"></div>
          <div className="absolute top-0 left-1 text-xs text-gray-300 whitespace-nowrap">
            {tick.label}
          </div>
        </div>
      ))}
      
      {/* Minor ticks */}
      {minorTicks.map(tick => (
        <div 
          key={tick.frame} 
          className="absolute w-px h-3 bg-gray-500"
          style={{ left: tick.x, top: rulerHeight - 12 }}
        ></div>
      ))}
      
      {/* Frame numbers on hover */}
      <div className="absolute bottom-0 left-0 text-xs text-gray-400 px-2">
        {totalDuration} frames
      </div>
    </div>
  );
}