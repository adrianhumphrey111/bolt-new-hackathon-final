'use client';

import { TimelineItem, MediaType } from '../../../types/timeline';
import { v4 as uuidv4 } from 'uuid';

interface DetectedCut {
  id: string;
  source_start: number;
  source_end: number;
  cut_type: string;
  is_active: boolean;
  video_id: string;
}

interface CutApplicationResult {
  modifiedItems: TimelineItem[];
  removedItemIds: string[];
}

/**
 * Service for applying cuts to timeline items
 * Takes applied cuts and modifies timeline items by splitting/removing segments
 */
export class CutApplicationService {
  
  /**
   * Apply cuts to a set of timeline items
   * @param timelineItems - Original timeline items
   * @param videoId - Video ID to filter cuts for
   * @param fps - Frames per second for time conversion
   * @returns Modified timeline items with cuts applied
   */
  static async applyCutsToTimeline(
    timelineItems: TimelineItem[], 
    videoId: string, 
    fps: number
  ): Promise<CutApplicationResult> {
    
    try {
      // Fetch active cuts for this video
      const response = await fetch(`/api/videos/${videoId}/cuts?active=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cuts');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch cuts');
      }
      
      const cuts: DetectedCut[] = data.cuts || [];
      
      console.log('🔧 CutApplicationService - Input:', {
        videoId,
        totalItems: timelineItems.length,
        activeCuts: cuts.filter(cut => cut.is_active).length,
        cuts: cuts.filter(cut => cut.is_active)
      });
      
      // Filter timeline items for this video
      const videoItems = timelineItems.filter(item => 
        item.type === MediaType.VIDEO && 
        item.properties?.videoId === videoId
      );
      
      const nonVideoItems = timelineItems.filter(item => 
        !(item.type === MediaType.VIDEO && item.properties?.videoId === videoId)
      );
      
      console.log('🔧 CutApplicationService - Items:', {
        videoItems: videoItems.length,
        nonVideoItems: nonVideoItems.length,
        videoItemsDetails: videoItems.map(item => ({
          id: item.id,
          name: item.name,
          videoId: item.properties?.videoId,
          isCutSegment: item.properties?.isCutSegment,
          originalStartTime: item.properties?.originalStartTime,
          originalEndTime: item.properties?.originalEndTime
        }))
      });
      
      if (videoItems.length === 0 || cuts.length === 0) {
        console.log('🔧 CutApplicationService - Early return:', { videoItems: videoItems.length, cuts: cuts.length });
        return { modifiedItems: timelineItems, removedItemIds: [] };
      }
      
      // Apply cuts to each video item
      const modifiedVideoItems: TimelineItem[] = [];
      const removedItemIds: string[] = [];
      
      // Separate original items from cut segments
      const originalItems = videoItems.filter(item => !item.properties?.isCutSegment);
      const cutSegments = videoItems.filter(item => item.properties?.isCutSegment);
      
      console.log('🔧 CutApplicationService - Processing:', {
        originalItems: originalItems.length,
        cutSegments: cutSegments.length,
        originalItemsDetails: originalItems.map(item => ({ id: item.id, name: item.name })),
        cutSegmentsDetails: cutSegments.map(item => ({ id: item.id, name: item.name, isCutSegment: item.properties?.isCutSegment }))
      });
      
      // Handle reconstruction and cleanup
      if (originalItems.length === 0 && cutSegments.length > 0) {
        console.log('🔧 CutApplicationService - Only cut segments found, reconstructing original items to reapply cuts');
        
        // Group cut segments by their original item ID
        const segmentGroups = cutSegments.reduce((groups, segment) => {
          const originalId = segment.properties?.originalItemId;
          if (originalId) {
            if (!groups[originalId]) {
              groups[originalId] = [];
            }
            groups[originalId].push(segment);
          }
          return groups;
        }, {} as Record<string, TimelineItem[]>);
        
        // Reconstruct original items from cut segments
        Object.entries(segmentGroups).forEach(([originalId, segments]) => {
          if (segments.length === 0) return;
          
          // Sort segments by their original start time to reconstruct properly
          const sortedSegments = segments.sort((a, b) => 
            (a.properties?.originalStartTime || 0) - (b.properties?.originalStartTime || 0)
          );
          
          // Use the first segment as the base for the reconstructed item
          const firstSegment = sortedSegments[0];
          
          // Calculate original duration from the full span of all segments
          const segmentStarts = sortedSegments.map(s => s.properties?.originalStartTime || 0);
          const segmentEnds = sortedSegments.map(s => s.properties?.originalEndTime || 0);
          
          const earliestStart = Math.min(...segmentStarts);
          const latestEnd = Math.max(...segmentEnds);
          const originalDuration = latestEnd - earliestStart;
          
          // Safety check: if the calculated duration seems too short, use the sum of segment durations as fallback
          const sumOfSegmentDurations = sortedSegments.reduce((total, segment) => 
            total + (segment.duration || 0), 0
          ) / fps; // Convert frames to seconds
          
          const finalDuration = originalDuration > 0 ? originalDuration : sumOfSegmentDurations;
          
          console.log(`🔧 Reconstruction debug:`, {
            originalId,
            segmentCount: sortedSegments.length,
            segmentDetails: sortedSegments.map(s => ({
              id: s.id,
              originalStart: s.properties?.originalStartTime,
              originalEnd: s.properties?.originalEndTime,
              duration: s.duration,
              originalDuration: s.properties?.originalDuration
            })),
            earliestStart,
            latestEnd,
            calculatedDuration: originalDuration,
            sumOfSegmentDurations,
            finalDuration,
            fps
          });
          
          const reconstructedItem: TimelineItem = {
            id: originalId, // Keep original ID for reconciliation system
            name: firstSegment.properties?.originalName || firstSegment.name,
            type: firstSegment.type,
            startTime: firstSegment.startTime, // Keep current timeline position
            duration: finalDuration * fps, // Convert seconds to frames
            endTime: firstSegment.startTime + (finalDuration * fps),
            trackId: firstSegment.trackId,
            // Preserve essential video properties
            src: firstSegment.src, // Critical: preserve video source URL
            content: firstSegment.content,
            videoId: firstSegment.videoId,
            properties: {
              ...firstSegment.properties,
              // Remove cut segment properties to mark as original
              isCutSegment: false,
              originalItemId: undefined,
              originalStartTime: earliestStart, // Preserve actual source start time
              originalEndTime: latestEnd, // Preserve actual source end time
              originalDuration: undefined,
              originalName: undefined,
              // Preserve other properties like video path, etc.
            }
          };
          
          originalItems.push(reconstructedItem);
          console.log(`🔧 Reconstructed original item: ${reconstructedItem.name} (${finalDuration}s) from ${segments.length} segments`);
        });
        
        console.log(`🔧 Reconstructed ${originalItems.length} original items from ${cutSegments.length} cut segments`);
      }
      
      // Always remove existing cut segments when reapplying cuts (single cleanup)
      cutSegments.forEach(segment => {
        removedItemIds.push(segment.id);
      });
      
      // Process original items
      console.log(`🔧 Processing ${originalItems.length} original items with ${cuts.length} cuts`);
      for (const item of originalItems) {
        console.log(`🔧 Applying cuts to item:`, {
          itemId: item.id,
          itemName: item.name,
          itemDuration: item.duration,
          itemVideoId: item.videoId,
          itemProperties: item.properties,
          cutsToApply: cuts.length,
          cuts: cuts.map(c => ({ id: c.id, start: c.source_start, end: c.source_end, type: c.cut_type, active: c.is_active }))
        });
        
        const result = this.applyCutsToItem(item, cuts, fps);
        
        console.log(`🔧 Cut application result:`, {
          itemId: item.id,
          originalItem: item.name,
          segmentsCreated: result.length,
          segments: result.map(s => ({ 
            id: s.id, 
            name: s.name, 
            duration: s.duration, 
            startTime: s.startTime,
            originalStartTime: s.properties?.originalStartTime,
            originalEndTime: s.properties?.originalEndTime
          }))
        });
        
        if (result.length === 0) {
          // Item was completely cut out
          removedItemIds.push(item.id);
        } else if (result.length === 1 && cuts.length === 0) {
          // No cuts to apply, keep original item
          modifiedVideoItems.push(item);
        } else {
          // Remove the original item and add the segments
          removedItemIds.push(item.id);
          modifiedVideoItems.push(...result);
        }
      }
      
      // Combine modified video items with non-video items
      const allModifiedItems = [...nonVideoItems, ...modifiedVideoItems];
      
      return { 
        modifiedItems: allModifiedItems, 
        removedItemIds 
      };
      
    } catch (error) {
      console.error('Error applying cuts to timeline:', error);
      return { modifiedItems: timelineItems, removedItemIds: [] };
    }
  }
  
  /**
   * Apply cuts to a single timeline item
   * @param item - Timeline item to modify
   * @param cuts - Array of cuts to apply
   * @param fps - Frames per second
   * @returns Array of modified timeline items (may be split into multiple segments)
   */
  private static applyCutsToItem(
    item: TimelineItem, 
    cuts: DetectedCut[], 
    fps: number
  ): TimelineItem[] {
    const itemSourceStart = item.properties?.originalStartTime || 0;
    const itemSourceEnd = item.properties?.originalEndTime || (item.duration / fps);
    
    console.log(`🔧 applyCutsToItem debug:`, {
      itemId: item.id,
      itemName: item.name,
      itemSourceStart,
      itemSourceEnd,
      sourceRangeSpan: itemSourceEnd - itemSourceStart,
      itemDuration: item.duration,
      itemDurationInSeconds: item.duration / fps,
      fps,
      totalCuts: cuts.length,
      activeCuts: cuts.filter(c => c.is_active).length,
      itemProperties: item.properties,
      allCuts: cuts.map(c => ({
        id: c.id,
        start: c.source_start,
        end: c.source_end,
        type: c.cut_type,
        active: c.is_active
      }))
    });
    
    // Find cuts that intersect with this item's source range
    const relevantCuts = cuts
      .filter(cut => cut.is_active)
      .filter(cut => 
        (cut.source_start < itemSourceEnd && cut.source_end > itemSourceStart)
      )
      .sort((a, b) => a.source_start - b.source_start);
    
    console.log(`🔧 Relevant cuts found:`, {
      itemId: item.id,
      relevantCutsCount: relevantCuts.length,
      relevantCuts: relevantCuts.map(c => ({
        id: c.id,
        start: c.source_start,
        end: c.source_end,
        type: c.cut_type,
        intersects: c.source_start < itemSourceEnd && c.source_end > itemSourceStart
      }))
    });
    
    if (relevantCuts.length === 0) {
      console.log(`🔧 No relevant cuts found, returning original item: ${item.name}`);
      return [item];
    }
    
    // Create segments between cuts
    const segments: Array<{start: number, end: number}> = [];
    let currentPos = itemSourceStart;
    
    for (const cut of relevantCuts) {
      const cutStart = Math.max(cut.source_start, itemSourceStart);
      const cutEnd = Math.min(cut.source_end, itemSourceEnd);
      
      // Add segment before cut (if any)
      if (currentPos < cutStart) {
        segments.push({ start: currentPos, end: cutStart });
      }
      
      // Skip the cut region
      currentPos = Math.max(currentPos, cutEnd);
    }
    
    // Add final segment after last cut (if any)
    if (currentPos < itemSourceEnd) {
      segments.push({ start: currentPos, end: itemSourceEnd });
    }
    
    // Filter out segments that are too short (less than 0.1 seconds)
    const validSegments = segments.filter(seg => (seg.end - seg.start) >= 0.1);
    
    console.log(`🔧 Segment creation debug:`, {
      itemId: item.id,
      rawSegments: segments,
      validSegments,
      filteredOut: segments.length - validSegments.length,
      segmentDetails: validSegments.map(seg => ({
        start: seg.start,
        end: seg.end,
        duration: seg.end - seg.start
      }))
    });
    
    if (validSegments.length === 0) {
      console.log(`🔧 Item completely cut out: ${item.name}`);
      return []; // Item completely cut out
    }
    
    // Convert segments to timeline items
    const resultItems: TimelineItem[] = [];
    let timelineOffset = item.startTime;
    
    for (let i = 0; i < validSegments.length; i++) {
      const segment = validSegments[i];
      const segmentDuration = (segment.end - segment.start) * fps;
      
      // Generate unique ID for each segment to avoid React key conflicts
      const segmentId = uuidv4();
      
      const newItem: TimelineItem = {
        ...item,
        id: segmentId,
        name: validSegments.length > 1 ? `${item.name} (${i + 1}/${validSegments.length})` : item.name,
        startTime: timelineOffset,
        duration: Math.round(segmentDuration),
        endTime: timelineOffset + Math.round(segmentDuration),
        // Preserve essential video properties
        src: item.src, // Critical: preserve video source URL
        content: item.content,
        videoId: item.videoId,
        properties: {
          ...item.properties,
          originalStartTime: segment.start,
          originalEndTime: segment.end,
          originalDuration: (segment.end - segment.start), // Store original segment duration in seconds
          originalName: item.name, // Store original item name for reconstruction
          isCutSegment: true,
          segmentIndex: i,
          totalSegments: validSegments.length,
          originalItemId: item.id // Keep reference to original item
        }
      };
      
      resultItems.push(newItem);
      
      // Place segments consecutively for seamless rendering (no gaps)
      timelineOffset += Math.round(segmentDuration);
    }
    
    console.log(`🔧 Final result items:`, {
      itemId: item.id,
      originalItemName: item.name,
      originalItemSrc: item.src,
      segmentsCreated: resultItems.length,
      resultItems: resultItems.map(r => ({
        id: r.id,
        name: r.name,
        startTime: r.startTime,
        duration: r.duration,
        src: r.src,
        videoId: r.videoId,
        hasSrc: !!r.src,
        originalStartTime: r.properties?.originalStartTime,
        originalEndTime: r.properties?.originalEndTime,
        isCutSegment: r.properties?.isCutSegment
      }))
    });
    
    return resultItems;
  }
  
  /**
   * Calculate total time saved by applied cuts
   * @param cuts - Array of cuts
   * @returns Time saved in seconds
   */
  static calculateTimeSaved(cuts: DetectedCut[]): number {
    return cuts
      .filter(cut => cut.is_active)
      .reduce((total, cut) => total + (cut.source_end - cut.source_start), 0);
  }
  
  /**
   * Get cut statistics
   * @param cuts - Array of cuts
   * @returns Cut statistics object
   */
  static getCutStats(cuts: DetectedCut[]) {
    const activeCuts = cuts.filter(cut => cut.is_active);
    const totalCuts = cuts.length;
    const timeSaved = this.calculateTimeSaved(cuts);
    
    const cutsByType = activeCuts.reduce((acc, cut) => {
      acc[cut.cut_type] = (acc[cut.cut_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalCuts,
      activeCuts: activeCuts.length,
      timeSaved,
      cutsByType
    };
  }
}