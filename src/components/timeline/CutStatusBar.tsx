'use client';

import { useState, useEffect } from 'react';
import { FiEye, FiList, FiRotateCcw, FiSettings } from 'react-icons/fi';

interface CutStatusBarProps {
  videoId: string;
  onShowOriginal: () => void;
  onReviewCuts: () => void;
  cuts: DetectedCut[];
  onRestoreAllCuts: () => Promise<void>;
  className?: string;
}

interface DetectedCut {
  id: string;
  source_start: number;
  source_end: number;
  cut_type: string;
  confidence: number;
  reasoning: string;
  affected_text: string;
  is_active: boolean;
  video_id: string;
}

interface CutStats {
  totalCuts: number;
  activeCuts: number;
  timeSaved: number;
  cutsByType: Record<string, number>;
}

const cutTypeIcons: Record<string, string> = {
  filler_word: '🗣️',
  bad_take: '🔄',
  silence: '⏸️',
  off_topic: '💭',
  repetitive_content: '🔁'
};

const cutTypeLabels: Record<string, string> = {
  filler_word: 'Filler Words',
  bad_take: 'Bad Takes',
  silence: 'Pauses',
  off_topic: 'Off-Topic',
  repetitive_content: 'Repetitive'
};

export function CutStatusBar({ videoId, onShowOriginal, onReviewCuts, cuts, onRestoreAllCuts, className = '' }: CutStatusBarProps) {
  const [cutStats, setCutStats] = useState<CutStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (cuts.length > 0) {
      const stats = calculateStats(cuts);
      setCutStats(stats);
    }
  }, [cuts]);

  const calculateStats = (cuts: any[]): CutStats => {
    const totalCuts = cuts.length;
    const activeCuts = cuts.filter(cut => cut.is_active).length;
    const timeSaved = cuts
      .filter(cut => cut.is_active)
      .reduce((acc, cut) => acc + (cut.source_end - cut.source_start), 0);
    
    const cutsByType = cuts
      .filter(cut => cut.is_active)
      .reduce((acc, cut) => {
        acc[cut.cut_type] = (acc[cut.cut_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalCuts,
      activeCuts,
      timeSaved,
      cutsByType
    };
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const undoAllCuts = async () => {
    try {
      await onRestoreAllCuts();
    } catch (error) {
      console.error('Error undoing cuts:', error);
    }
  };

  // Don't render if no cuts
  if (!cutStats || cutStats.activeCuts === 0) {
    return null;
  }

  return (
    <div className={`bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              💡
            </div>
            <span className="text-white font-medium">
              {cutStats.activeCuts} cuts applied
            </span>
            <span className="text-blue-400">
              • {formatTime(cutStats.timeSaved)} saved
            </span>
          </div>

          {isExpanded && (
            <div className="flex items-center gap-3 text-sm">
              {Object.entries(cutStats.cutsByType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1 text-gray-300">
                  <span>{cutTypeIcons[type]}</span>
                  <span>{cutTypeLabels[type]} ({count})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>

          <button
            onClick={onShowOriginal}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Show original video with cuts"
          >
            <FiEye className="w-3 h-3" />
            <span>Show Original</span>
          </button>

          <button
            onClick={onReviewCuts}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Review and manage cuts"
          >
            <FiList className="w-3 h-3" />
            <span>Review Cuts</span>
          </button>

          <button
            onClick={undoAllCuts}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            title="Undo all cuts"
          >
            <FiRotateCcw className="w-3 h-3" />
            <span>Undo All</span>
          </button>
        </div>
      </div>
    </div>
  );
}