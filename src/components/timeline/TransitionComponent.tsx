"use client";

import React, { useState } from 'react';
import { useTimeline } from './TimelineContext';
import { Transition } from '../../../types/timeline';

interface TransitionComponentProps {
  transition: Transition;
}

export function TransitionComponent({ transition }: TransitionComponentProps) {
  const { state, actions } = useTimeline();
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const pixelsPerFrame = state.zoom;
  const left = transition.position * pixelsPerFrame;
  const width = transition.duration * pixelsPerFrame;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(!isSelected);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Open transition properties panel
    console.log('Edit transition:', transition.name);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.removeTransition(transition.id);
  };

  const getTransitionIcon = () => {
    switch (transition.type) {
      case 'fade':
        return '🌅';
      case 'slide':
        return '➡️';
      case 'wipe':
        return '🧹';
      case 'flip':
        return '🔄';
      case 'clockWipe':
        return '🕐';
      case 'iris':
        return '👁️';
      default:
        return '⚡';
    }
  };

  return (
    <div
      className={`
        absolute top-0 bottom-0 rounded transition-all duration-200 cursor-pointer z-30
        bg-gradient-to-r from-purple-500 to-blue-500
        ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        ${isHovered ? 'shadow-lg scale-105' : 'shadow-md'}
      `}
      style={{
        left,
        width: Math.max(width, 20), // Minimum width for visibility
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Transition content */}
      <div className="h-full flex items-center justify-center px-2">
        <div className="flex items-center space-x-1 text-white">
          <span className="text-sm">{getTransitionIcon()}</span>
          {width > 60 && (
            <span className="text-xs font-medium truncate">
              {transition.name}
            </span>
          )}
        </div>
      </div>

      {/* Delete button on hover */}
      {isHovered && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          title="Remove transition"
        >
          ×
        </button>
      )}

      {/* Duration indicator */}
      {width > 40 && (
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-xs text-white/80 bg-black/20 px-1 rounded">
            {Math.round(transition.duration / state.fps * 10) / 10}s
          </div>
        </div>
      )}
    </div>
  );
}