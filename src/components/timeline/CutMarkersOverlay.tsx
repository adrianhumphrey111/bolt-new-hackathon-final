'use client';

import { useState, useEffect, useCallback } from 'react';
import { CutMarker } from './CutMarker';

interface CutMarkersOverlayProps {
  videoId: string;
  timelineItems: any[];
  timelineWidth: number;
  timelineStartTime: number;
  timelineEndTime: number;
  fps: number;
  cuts: DetectedCut[];
  onCutRestored: (cutId: string) => Promise<void>;
  onCutPreview: (cutId: string) => void;
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

interface CutPosition {
  cut: DetectedCut;
  timelinePosition: number;
  isVisible: boolean;
}

export function CutMarkersOverlay({
  videoId,
  timelineItems,
  timelineWidth,
  timelineStartTime,
  timelineEndTime,
  fps,
  cuts,
  onCutRestored,
  onCutPreview
}: CutMarkersOverlayProps) {
  const [cutPositions, setCutPositions] = useState<CutPosition[]>([]);

  useEffect(() => {
    if (cuts.length > 0 && timelineItems.length > 0) {
      calculateCutPositions();
    }
  }, [cuts, timelineItems, timelineWidth, timelineStartTime, timelineEndTime]);


  const calculateCutPositions = useCallback(() => {
    const positions: CutPosition[] = [];
    const timelineRange = timelineEndTime - timelineStartTime;
    
    for (const cut of cuts) {
      // Find timeline items that contain this cut
      const relevantItems = timelineItems.filter(item => 
        item.videoId === videoId && 
        item.properties?.originalStartTime <= cut.source_start &&
        item.properties?.originalEndTime >= cut.source_start
      );

      for (const item of relevantItems) {
        // Calculate the position of this cut within the timeline item
        const itemSourceStart = item.properties?.originalStartTime || 0;
        const itemSourceEnd = item.properties?.originalEndTime || item.duration / fps;
        const itemTimelineStart = item.startTime / fps;
        const itemTimelineEnd = (item.startTime + item.duration) / fps;

        // Check if cut is within this item's source range
        if (cut.source_start >= itemSourceStart && cut.source_start <= itemSourceEnd) {
          // Calculate relative position within the item
          const relativePosition = (cut.source_start - itemSourceStart) / (itemSourceEnd - itemSourceStart);
          const cutTimelineTime = itemTimelineStart + (relativePosition * (itemTimelineEnd - itemTimelineStart));

          // Check if cut is visible in current timeline view
          if (cutTimelineTime >= timelineStartTime && cutTimelineTime <= timelineEndTime) {
            // Calculate pixel position
            const relativeTimelinePosition = (cutTimelineTime - timelineStartTime) / timelineRange;
            const pixelPosition = relativeTimelinePosition * timelineWidth;

            positions.push({
              cut,
              timelinePosition: pixelPosition,
              isVisible: true
            });
          }
        }
      }
    }

    setCutPositions(positions);
  }, [cuts, timelineItems, videoId, timelineWidth, timelineStartTime, timelineEndTime, fps]);

  const handleCutRestore = async (cutId: string) => {
    try {
      await onCutRestored(cutId);
    } catch (error) {
      console.error('Error restoring cut:', error);
    }
  };

  if (cutPositions.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {cutPositions.map((position, index) => (
        <div key={`${position.cut.id}-${index}`} className="pointer-events-auto">
          <CutMarker
            cut={position.cut}
            timelinePosition={position.timelinePosition}
            onRestore={handleCutRestore}
            onPreview={onCutPreview}
            fps={fps}
          />
        </div>
      ))}
    </div>
  );
}