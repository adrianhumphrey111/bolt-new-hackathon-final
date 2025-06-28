"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TimelineState, TimelineContextType, TimelineConfig, Track, TimelineItem, MediaType } from '../../../types/timeline';
import { v4 as uuidv4 } from 'uuid';

const defaultConfig: TimelineConfig = {
  pixelsPerFrame: 2,
  trackHeight: 60,
  rulerHeight: 30,
  snapThreshold: 5,
  minZoom: 0.5,
  maxZoom: 10,
};

const initialState: TimelineState = {
  tracks: [],
  playheadPosition: 0,
  totalDuration: 900, // 30 seconds at 30fps
  zoom: 2,
  fps: 30,
  selectedItems: [],
  isPlaying: false,
};

type TimelineAction =
  | { type: 'ADD_TRACK' }
  | { type: 'REMOVE_TRACK'; trackId: string }
  | { type: 'ADD_ITEM'; item: Omit<TimelineItem, 'id'> }
  | { type: 'UPDATE_ITEM'; itemId: string; updates: Partial<TimelineItem> }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'MOVE_ITEM'; itemId: string; trackId: string; startTime: number }
  | { type: 'SET_PLAYHEAD'; position: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SELECT_ITEMS'; itemIds: string[] }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SPLIT_ITEM'; itemId: string; position: number }
  | { type: 'TRIM_ITEM'; itemId: string; start: number; end: number };

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'ADD_TRACK': {
      const newTrack: Track = {
        id: uuidv4(),
        name: `Track ${state.tracks.length + 1}`,
        items: [],
        height: defaultConfig.trackHeight,
      };
      return {
        ...state,
        tracks: [...state.tracks, newTrack],
      };
    }

    case 'REMOVE_TRACK': {
      return {
        ...state,
        tracks: state.tracks.filter(track => track.id !== action.trackId),
      };
    }

    case 'ADD_ITEM': {
      const newItem: TimelineItem = {
        ...action.item,
        id: uuidv4(),
      };

      const targetTrackId = action.item.trackId;
      const targetTrack = state.tracks.find(track => track.id === targetTrackId);

      // If track doesn't exist or has overlap, create new track
      if (!targetTrack || hasOverlap(targetTrack.items, newItem)) {
        const newTrack: Track = {
          id: uuidv4(),
          name: `Track ${state.tracks.length + 1}`,
          items: [{ ...newItem, trackId: uuidv4() }],
          height: defaultConfig.trackHeight,
        };
        newItem.trackId = newTrack.id;
        
        return {
          ...state,
          tracks: [...state.tracks, newTrack],
        };
      }

      return {
        ...state,
        tracks: state.tracks.map(track =>
          track.id === targetTrackId
            ? { ...track, items: [...track.items, newItem] }
            : track
        ),
      };
    }

    case 'UPDATE_ITEM': {
      return {
        ...state,
        tracks: state.tracks.map(track => ({
          ...track,
          items: track.items.map(item =>
            item.id === action.itemId
              ? { ...item, ...action.updates }
              : item
          ),
        })),
      };
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        tracks: state.tracks.map(track => ({
          ...track,
          items: track.items.filter(item => item.id !== action.itemId),
        })),
        selectedItems: state.selectedItems.filter(id => id !== action.itemId),
      };
    }

    case 'MOVE_ITEM': {
      const item = findItemById(state.tracks, action.itemId);
      if (!item) return state;

      const updatedItem = { ...item, trackId: action.trackId, startTime: action.startTime };
      const targetTrack = state.tracks.find(track => track.id === action.trackId);

      // Check for overlap
      if (targetTrack && hasOverlap(targetTrack.items.filter(i => i.id !== action.itemId), updatedItem)) {
        // Create new track
        const newTrack: Track = {
          id: uuidv4(),
          name: `Track ${state.tracks.length + 1}`,
          items: [{ ...updatedItem, trackId: uuidv4() }],
          height: defaultConfig.trackHeight,
        };
        updatedItem.trackId = newTrack.id;

        return {
          ...state,
          tracks: [
            ...state.tracks.map(track => ({
              ...track,
              items: track.items.filter(i => i.id !== action.itemId),
            })),
            newTrack,
          ],
        };
      }

      return {
        ...state,
        tracks: state.tracks.map(track => ({
          ...track,
          items: track.items
            .filter(item => item.id !== action.itemId)
            .concat(track.id === action.trackId ? [updatedItem] : []),
        })),
      };
    }

    case 'SET_PLAYHEAD': {
      return {
        ...state,
        playheadPosition: Math.max(0, Math.min(action.position, state.totalDuration)),
      };
    }

    case 'SET_ZOOM': {
      return {
        ...state,
        zoom: Math.max(defaultConfig.minZoom, Math.min(action.zoom, defaultConfig.maxZoom)),
      };
    }

    case 'SELECT_ITEMS': {
      return {
        ...state,
        selectedItems: action.itemIds,
      };
    }

    case 'SET_PLAYING': {
      return {
        ...state,
        isPlaying: action.playing,
      };
    }

    case 'SPLIT_ITEM': {
      const item = findItemById(state.tracks, action.itemId);
      if (!item || action.position <= item.startTime || action.position >= item.startTime + item.duration) {
        return state;
      }

      const firstPart: TimelineItem = {
        ...item,
        id: uuidv4(),
        duration: action.position - item.startTime,
      };

      const secondPart: TimelineItem = {
        ...item,
        id: uuidv4(),
        startTime: action.position,
        duration: item.startTime + item.duration - action.position,
      };

      return {
        ...state,
        tracks: state.tracks.map(track => ({
          ...track,
          items: track.items.flatMap(i =>
            i.id === action.itemId ? [firstPart, secondPart] : [i]
          ),
        })),
      };
    }

    case 'TRIM_ITEM': {
      return {
        ...state,
        tracks: state.tracks.map(track => ({
          ...track,
          items: track.items.map(item =>
            item.id === action.itemId
              ? {
                  ...item,
                  startTime: action.start,
                  duration: action.end - action.start,
                }
              : item
          ),
        })),
      };
    }

    default:
      return state;
  }
}

function hasOverlap(items: TimelineItem[], newItem: TimelineItem): boolean {
  return items.some(item => {
    const itemEnd = item.startTime + item.duration;
    const newItemEnd = newItem.startTime + newItem.duration;
    return !(newItem.startTime >= itemEnd || newItemEnd <= item.startTime);
  });
}

function findItemById(tracks: Track[], itemId: string): TimelineItem | null {
  for (const track of tracks) {
    const item = track.items.find(item => item.id === itemId);
    if (item) return item;
  }
  return null;
}

const TimelineContext = createContext<TimelineContextType | null>(null);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timelineReducer, initialState);

  const actions = {
    addTrack: () => dispatch({ type: 'ADD_TRACK' }),
    removeTrack: (trackId: string) => dispatch({ type: 'REMOVE_TRACK', trackId }),
    addItem: (item: Omit<TimelineItem, 'id'>) => dispatch({ type: 'ADD_ITEM', item }),
    updateItem: (itemId: string, updates: Partial<TimelineItem>) =>
      dispatch({ type: 'UPDATE_ITEM', itemId, updates }),
    removeItem: (itemId: string) => dispatch({ type: 'REMOVE_ITEM', itemId }),
    moveItem: (itemId: string, trackId: string, startTime: number) =>
      dispatch({ type: 'MOVE_ITEM', itemId, trackId, startTime }),
    setPlayheadPosition: (position: number) => dispatch({ type: 'SET_PLAYHEAD', position }),
    setZoom: (zoom: number) => dispatch({ type: 'SET_ZOOM', zoom }),
    selectItems: (itemIds: string[]) => dispatch({ type: 'SELECT_ITEMS', itemIds }),
    setPlaying: (playing: boolean) => dispatch({ type: 'SET_PLAYING', playing }),
    splitItem: (itemId: string, position: number) =>
      dispatch({ type: 'SPLIT_ITEM', itemId, position }),
    trimItem: (itemId: string, start: number, end: number) =>
      dispatch({ type: 'TRIM_ITEM', itemId, start, end }),
  };

  const contextValue: TimelineContextType = {
    state,
    config: defaultConfig,
    actions,
  };

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}