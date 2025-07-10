'use client';

import { useState } from 'react';
import { FiRotateCcw, FiEye } from 'react-icons/fi';

interface CutMarkerProps {
  cut: {
    id: string;
    source_start: number;
    source_end: number;
    cut_type: string;
    confidence: number;
    reasoning: string;
    affected_text: string;
    is_active: boolean;
  };
  timelinePosition: number; // Position in pixels from left
  onRestore: (cutId: string) => void;
  onPreview: (cutId: string) => void;
  fps: number;
}

const cutTypeIcons: Record<string, string> = {
  filler_word: '🗣️',
  bad_take: '🔄',
  silence: '⏸️',
  off_topic: '💭',
  repetitive_content: '🔁'
};

const cutTypeLabels: Record<string, string> = {
  filler_word: 'Filler word',
  bad_take: 'Bad take',
  silence: 'Long pause',
  off_topic: 'Off-topic',
  repetitive_content: 'Repetitive content'
};

export function CutMarker({ cut, timelinePosition, onRestore, onPreview, fps }: CutMarkerProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await onRestore(cut.id);
      setShowTooltip(false);
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePreview = () => {
    onPreview(cut.id);
    setShowTooltip(false);
  };

  const duration = cut.source_end - cut.source_start;
  const cutTypeLabel = cutTypeLabels[cut.cut_type] || cut.cut_type;
  const cutTypeIcon = cutTypeIcons[cut.cut_type] || '✂️';

  return (
    <div
      className="absolute top-0 z-10"
      style={{ left: `${timelinePosition}px` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Cut Marker */}
      <div className="relative">
        <div className="w-2 h-2 bg-orange-500 rounded-full cursor-pointer hover:bg-orange-400 transition-colors border border-orange-600">
          <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75"></div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg min-w-64 max-w-80">
              {/* Arrow */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-600 rotate-45"></div>
              
              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cutTypeIcon}</span>
                  <span className="text-white font-medium">{cutTypeLabel}</span>
                </div>
                
                <div className="text-sm text-gray-300 space-y-1">
                  <div>
                    <span className="text-gray-400">Time:</span> {formatTime(cut.source_start)} - {formatTime(cut.source_end)}
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span> {duration.toFixed(1)}s saved
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span> {Math.round(cut.confidence * 100)}%
                  </div>
                </div>

                <div className="text-sm text-gray-300">
                  <div className="text-gray-400 mb-1">Reason:</div>
                  <div className="text-gray-200">{cut.reasoning}</div>
                </div>

                {cut.affected_text && (
                  <div className="text-sm text-gray-300">
                    <div className="text-gray-400 mb-1">Affected text:</div>
                    <div className="text-gray-200 italic bg-gray-800 p-2 rounded text-xs">
                      "{cut.affected_text}"
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-700">
                  <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiRotateCcw className="w-3 h-3" />
                    )}
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={handlePreview}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    <FiEye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}