import { TimelineState } from '../../types/timeline';
import { createClientSupabaseClient } from './supabase/client';

export interface SavedTimeline {
  id: string;
  projectId: string;
  title?: string;
  description?: string;
  version: number;
  totalDuration: number;
  frameRate: number;
  zoom: number;
  playheadPosition: number;
  pixelsPerFrame: number;
  timelineData: {
    tracks: any[];
    selectedItems: string[];
  };
  status: 'draft' | 'auto_saved' | 'manually_saved' | 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string;
}

export interface SaveTimelineRequest {
  timelineData: {
    tracks: any[];
    selectedItems: string[];
  };
  totalDuration?: number;
  frameRate?: number;
  zoom?: number;
  playheadPosition?: number;
  pixelsPerFrame?: number;
  status?: 'draft' | 'auto_saved' | 'manually_saved';
  title?: string;
  description?: string;
}

export interface TimelinePersistenceService {
  loadTimeline(projectId: string): Promise<SavedTimeline | null>;
  saveTimeline(projectId: string, data: SaveTimelineRequest): Promise<SavedTimeline>;
  deleteTimeline(projectId: string): Promise<void>;
}

class TimelinePersistenceServiceImpl implements TimelinePersistenceService {
  async loadTimeline(projectId: string): Promise<SavedTimeline | null> {
    try {
      const response = await fetch(`/api/timeline/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No timeline found
        }
        throw new Error(`Failed to load timeline: ${response.statusText}`);
      }

      const result = await response.json();
      return result.timeline;
    } catch (error) {
      console.error('Error loading timeline:', error);
      throw error;
    }
  }

  async saveTimeline(projectId: string, data: SaveTimelineRequest): Promise<SavedTimeline> {
    try {
      const response = await fetch(`/api/timeline/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to save timeline: ${response.statusText}`);
      }

      const result = await response.json();
      return result.timeline;
    } catch (error) {
      console.error('Error saving timeline:', error);
      throw error;
    }
  }

  async deleteTimeline(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/timeline/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete timeline: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting timeline:', error);
      throw error;
    }
  }
}

// Utility functions for converting between TimelineState and SaveTimelineRequest
export function timelineStateToSaveRequest(
  state: TimelineState,
  status: 'draft' | 'auto_saved' | 'manually_saved' = 'auto_saved'
): SaveTimelineRequest {
  return {
    timelineData: {
      tracks: state.tracks,
      selectedItems: [], // Don't persist UI selection state
    },
    totalDuration: state.totalDuration / state.fps, // Convert frames to seconds for storage
    frameRate: state.fps,
    zoom: state.zoom,
    playheadPosition: state.playheadPosition,
    pixelsPerFrame: 2.0, // Default value, can be made configurable
    status,
  };
}

export function savedTimelineToState(savedTimeline: SavedTimeline): Partial<TimelineState> {
  // Ensure tracks have proper structure
  const tracks = (savedTimeline.timelineData.tracks || []).map(track => ({
    ...track,
    items: track.items || [], // Ensure items array exists
    height: track.height || 60, // Ensure height exists
  }));

  return {
    tracks,
    playheadPosition: savedTimeline.playheadPosition || 0,
    totalDuration: (savedTimeline.totalDuration || 30) * (savedTimeline.frameRate || 30), // Convert seconds to frames
    zoom: savedTimeline.zoom || 2,
    fps: savedTimeline.frameRate || 30,
    selectedItems: [], // Reset selection state
    isPlaying: false, // Reset playing state
    // Don't include history - it will be reset
  };
}

// Create singleton instance
export const timelinePersistence = new TimelinePersistenceServiceImpl();

// Debounce utility for auto-saving
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Hash function to detect meaningful state changes (excluding UI state and playhead)
export function getTimelineStateHash(state: TimelineState): string {
  const relevantState = {
    tracks: state.tracks,
    totalDuration: state.totalDuration,
    zoom: state.zoom,
    // Exclude playheadPosition from hash to prevent auto-save on playhead moves
  };
  
  return JSON.stringify(relevantState);
}

// Separate hash for major changes only (tracks, items, etc.)
export function getMajorChangesHash(state: TimelineState): string {
  const majorState = {
    tracks: state.tracks.map(track => ({
      id: track.id,
      name: track.name,
      items: track.items.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        startTime: item.startTime,
        duration: item.duration,
        src: item.src,
        content: item.content
      }))
    }))
  };
  
  return JSON.stringify(majorState);
}

// Storage status types
export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved' | 'conflict' | 'loading';

export interface PersistenceState {
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  error: string | null;
  version: number;
}

export const initialPersistenceState: PersistenceState = {
  isSaving: false,
  isLoading: false,
  lastSaved: null,
  hasUnsavedChanges: false,
  saveStatus: 'saved',
  error: null,
  version: 1,
};