"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AspectRatio {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  description: string;
}

const aspectRatios: AspectRatio[] = [
  {
    id: 'original',
    label: 'Original',
    ratio: 'Original aspect ratio',
    width: 1920,
    height: 1080,
    description: 'Keep original dimensions'
  },
  {
    id: '16:9',
    label: '16:9',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    description: 'YouTube ads'
  },
  {
    id: '4:3',
    label: '4:3',
    ratio: '4:3',
    width: 1024,
    height: 768,
    description: 'LinkedIn ads, Facebook'
  },
  {
    id: '2:1',
    label: '2:1',
    ratio: '2:1',
    width: 1200,
    height: 600,
    description: 'Wide banner format'
  },
  {
    id: '9:16',
    label: '9:16',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    description: 'TikTok, TikTok ads'
  },
  {
    id: '1:1',
    label: '1:1',
    ratio: '1:1',
    width: 1080,
    height: 1080,
    description: 'Instagram posts'
  },
  {
    id: '3:4',
    label: '3:4',
    ratio: '3:4',
    width: 1080,
    height: 1440,
    description: 'Instagram stories'
  },
];

interface CanvasSizeSelectorProps {
  currentAspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
}

export function CanvasSizeSelector({ currentAspectRatio, onAspectRatioChange }: CanvasSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (aspectRatio: AspectRatio) => {
    onAspectRatioChange(aspectRatio);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-lg border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
      >
        <div className="flex items-center space-x-2">
          {/* Aspect ratio icon */}
          <div className="w-4 h-4 border border-white/60 rounded-sm flex items-center justify-center">
            <div 
              className="bg-white/60 rounded-sm"
              style={{
                width: currentAspectRatio.width > currentAspectRatio.height ? '10px' : '6px',
                height: currentAspectRatio.width > currentAspectRatio.height ? '6px' : '10px',
              }}
            />
          </div>
          <span className="text-sm font-medium">{currentAspectRatio.label}</span>
        </div>
        
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Canvas size</h3>
          </div>

          {/* Options */}
          <div className="max-h-80 overflow-y-auto">
            {aspectRatios.map((aspectRatio) => {
              const isSelected = currentAspectRatio.id === aspectRatio.id;
              
              return (
                <button
                  key={aspectRatio.id}
                  onClick={() => handleSelect(aspectRatio)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 group
                    ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                  `}
                >
                  {/* Aspect ratio icon */}
                  <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-100 group-hover:border-gray-400 transition-colors">
                    <div 
                      className={`rounded-sm transition-colors ${
                        isSelected ? 'bg-blue-500' : 'bg-gray-400 group-hover:bg-gray-500'
                      }`}
                      style={{
                        width: aspectRatio.width > aspectRatio.height ? '16px' : '10px',
                        height: aspectRatio.width > aspectRatio.height ? '10px' : '16px',
                      }}
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {aspectRatio.label}
                      </span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{aspectRatio.description}</div>
                    <div className="text-xs text-gray-400">{aspectRatio.width} × {aspectRatio.height}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the aspect ratios for use in other components
export { aspectRatios };
export type { AspectRatio };