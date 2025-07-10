'use client';

import { useState, useEffect } from 'react';
import { FiX, FiScissors, FiCheck, FiRotateCcw, FiPlay, FiEye, FiEyeOff } from 'react-icons/fi';

interface CutReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoName: string;
  cuts: DetectedCut[];
  onApplyCut: (cutId: string) => Promise<void>;
  onRestoreCut: (cutId: string) => Promise<void>;
  onApplyAllCuts: () => Promise<void>;
  onRestoreAllCuts: () => Promise<void>;
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
  created_at: string;
}

interface CutStats {
  totalCuts: number;
  activeCuts: number;
  totalTimeSaved: number;
  cutsByType: Record<string, number>;
}

const cutTypeIcons: Record<string, string> = {
  filler_word: '🗣️',
  bad_take: '🔄',
  silence: '⏸️',
  off_topic: '💭',
  repetitive_content: '🔁'
};

const cutTypeColors: Record<string, string> = {
  filler_word: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  bad_take: 'bg-red-500/20 border-red-500/30 text-red-400',
  silence: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  off_topic: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  repetitive_content: 'bg-green-500/20 border-green-500/30 text-green-400'
};

export function CutReviewPanel({ 
  isOpen, 
  onClose, 
  videoId, 
  videoName, 
  cuts,
  onApplyCut,
  onRestoreCut,
  onApplyAllCuts,
  onRestoreAllCuts
}: CutReviewPanelProps) {
  const [stats, setStats] = useState<CutStats | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [processingCuts, setProcessingCuts] = useState<Set<string>>(new Set());

  // Calculate stats when cuts change
  useEffect(() => {
    if (cuts && cuts.length > 0) {
      calculateStats(cuts);
    }
  }, [cuts]);


  const calculateStats = (cutsData: DetectedCut[]) => {
    const totalCuts = cutsData.length;
    const activeCuts = cutsData.filter(cut => cut.is_active).length;
    const totalTimeSaved = cutsData
      .filter(cut => cut.is_active)
      .reduce((acc, cut) => acc + (cut.source_end - cut.source_start), 0);
    
    const cutsByType = cutsData.reduce((acc, cut) => {
      acc[cut.cut_type] = (acc[cut.cut_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalCuts,
      activeCuts,
      totalTimeSaved,
      cutsByType
    });
  };

  const toggleCut = async (cutId: string, currentActive: boolean) => {
    setProcessingCuts(prev => new Set(prev).add(cutId));
    
    try {
      if (currentActive) {
        // Restore cut (make inactive)
        await onRestoreCut(cutId);
      } else {
        // Apply cut (make active)
        await onApplyCut(cutId);
      }
    } catch (error) {
      console.error('Error toggling cut:', error);
      alert('Failed to update cut. Please try again.');
    } finally {
      setProcessingCuts(prev => {
        const newSet = new Set(prev);
        newSet.delete(cutId);
        return newSet;
      });
    }
  };

  const applyAllCuts = async () => {
    if (!cuts) return;
    
    const inactiveCutIds = cuts.filter(cut => !cut.is_active).map(cut => cut.id);
    
    if (inactiveCutIds.length === 0) {
      alert('All cuts are already applied');
      return;
    }

    try {
      await onApplyAllCuts();
    } catch (error) {
      console.error('Error applying all cuts:', error);
      alert('Failed to apply all cuts. Please try again.');
    }
  };

  const restoreAllCuts = async () => {
    if (!cuts) return;
    
    const activeCutIds = cuts.filter(cut => cut.is_active).map(cut => cut.id);
    
    if (activeCutIds.length === 0) {
      alert('No cuts are currently applied');
      return;
    }

    try {
      await onRestoreAllCuts();
    } catch (error) {
      console.error('Error restoring all cuts:', error);
      alert('Failed to restore all cuts. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    }
    return `${seconds.toFixed(1)}s`;
  };

  const filteredCuts = (cuts || []).filter(cut => {
    if (filterType !== 'all' && cut.cut_type !== filterType) return false;
    if (showActiveOnly && !cut.is_active) return false;
    return true;
  });

  const uniqueCutTypes = Array.from(new Set((cuts || []).map(cut => cut.cut_type)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FiScissors className="w-5 h-5 text-blue-400" />
              Cut Review: {videoName}
            </h2>
            {stats && (
              <p className="text-gray-400 text-sm mt-1">
                {stats.totalCuts} cuts detected • {stats.activeCuts} applied • {formatDuration(stats.totalTimeSaved)} saved
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Filter by type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white"
              >
                <option value="all">All Types</option>
                {uniqueCutTypes.map(type => (
                  <option key={type} value={type}>
                    {cutTypeIcons[type]} {type.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Show active only */}
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded"
                />
                Applied only
              </label>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={applyAllCuts}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                Apply All
              </button>
              <button
                onClick={restoreAllCuts}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <FiRotateCcw className="w-4 h-4" />
                Restore All
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {filteredCuts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-gray-400 mb-2">No cuts found</div>
                <div className="text-gray-500 text-sm">
                  {cuts.length === 0 ? 'No cuts detected for this video' : 'No cuts match the current filter'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 pb-8 space-y-3">
              {filteredCuts.map((cut) => {
                const duration = cut.source_end - cut.source_start;
                const isProcessing = processingCuts.has(cut.id);
                
                return (
                  <div
                    key={cut.id}
                    className={`border rounded-lg p-4 transition-all ${
                      cut.is_active 
                        ? 'bg-green-900/20 border-green-600/30'
                        : 'bg-gray-700/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs border ${cutTypeColors[cut.cut_type]}`}>
                          {cutTypeIcons[cut.cut_type]} {cut.cut_type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-white font-medium">
                          {formatTime(cut.source_start)} - {formatTime(cut.source_end)}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {formatDuration(duration)} • {Math.round(cut.confidence * 100)}% confidence
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleCut(cut.id, cut.is_active)}
                        disabled={isProcessing}
                        className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-2 ${
                          cut.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50`}
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : cut.is_active ? (
                          <>
                            <FiEyeOff className="w-4 h-4" />
                            Restore
                          </>
                        ) : (
                          <>
                            <FiScissors className="w-4 h-4" />
                            Apply Cut
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-gray-300 text-sm mb-2">
                      <span className="font-medium">Reasoning:</span> {cut.reasoning}
                    </div>
                    
                    {cut.affected_text && (
                      <div className="bg-gray-900 rounded p-3 text-sm">
                        <div className="text-gray-400 mb-1">Affected text:</div>
                        <div className="text-gray-300 italic">"{cut.affected_text}"</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}