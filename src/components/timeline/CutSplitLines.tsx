'use client';

import { useState, useEffect, useCallback } from 'react';

interface CutSplitLinesProps {
  videoId: string;
  timelineItem: {
    id: string;
    startTime: number;
    duration: number;
    videoId?: string;
    properties?: {
      originalStartTime?: number;
      originalEndTime?: number;
    };
  };
  zoom: number;
  fps: number;
  trackHeight: number;
}

interface DetectedCut {
  id: string;
  source_start: number;
  source_end: number;
  cut_type: string;
  is_active: boolean;
  video_id: string;
}

interface SplitLinePosition {
  cut: DetectedCut;
  pixelPosition: number;
  relativePosition: number; // 0-1 within the timeline item
}

export function CutSplitLines({ 
  videoId, 
  timelineItem, 
  zoom, 
  fps, 
  trackHeight 
}: CutSplitLinesProps) {
  const [cuts, setCuts] = useState<DetectedCut[]>([]);
  const [splitPositions, setSplitPositions] = useState<SplitLinePosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (videoId && timelineItem.videoId === videoId) {
      fetchCuts();
    }
  }, [videoId, timelineItem.videoId]);

  useEffect(() => {
    if (cuts.length > 0) {
      calculateSplitPositions();
    }
  }, [cuts, timelineItem, zoom]);

  const fetchCuts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/cuts?active=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCuts(data.cuts || []);
        }
      }
    } catch (error) {
      console.error('Error fetching cuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSplitPositions = useCallback(() => {
    if (!timelineItem.videoId || timelineItem.videoId !== videoId) {
      setSplitPositions([]);
      return;
    }

    const positions: SplitLinePosition[] = [];
    const itemSourceStart = timelineItem.properties?.originalStartTime || 0;
    const itemSourceEnd = timelineItem.properties?.originalEndTime || (timelineItem.duration / fps);
    const itemWidth = timelineItem.duration * zoom;

    for (const cut of cuts) {
      if (!cut.is_active) continue;

      // Check if the cut falls within this timeline item's source range
      const cutStart = cut.source_start;
      const cutEnd = cut.source_end;

      // Check if cut intersects with this item's source range
      if (cutStart >= itemSourceStart && cutStart <= itemSourceEnd) {
        // Calculate relative position within the item (0-1)
        const relativePosition = (cutStart - itemSourceStart) / (itemSourceEnd - itemSourceStart);
        const pixelPosition = relativePosition * itemWidth;

        positions.push({
          cut,
          pixelPosition,
          relativePosition
        });
      }

      // Also add line at cut end if it's within the item
      if (cutEnd >= itemSourceStart && cutEnd <= itemSourceEnd && cutEnd !== cutStart) {
        const relativePosition = (cutEnd - itemSourceStart) / (itemSourceEnd - itemSourceStart);
        const pixelPosition = relativePosition * itemWidth;

        positions.push({
          cut: { ...cut, id: `${cut.id}-end` },
          pixelPosition,
          relativePosition
        });
      }
    }

    setSplitPositions(positions);
  }, [cuts, timelineItem, zoom, fps, videoId]);

  if (loading || splitPositions.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {splitPositions.map((position, index) => (
        <div
          key={`${position.cut.id}-${index}`}
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-80 shadow-lg"
          style={{
            left: `${position.pixelPosition}px`,
            height: trackHeight,
            boxShadow: '0 0 3px rgba(248, 113, 113, 0.6)'
          }}
        >
          {/* Optional small indicator */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full opacity-90 shadow-sm" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-500 rounded-full opacity-90 shadow-sm" />
        </div>
      ))}
    </div>
  );
}