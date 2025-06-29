"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { TimelineState, TimelineContextType, TimelineConfig, Track, TimelineItem, MediaType } from '../../../types/timeline';
import { v4 as uuidv4 } from 'uuid';
import { 
  timelinePersistence, 
  timelineStateToSaveRequest, 
  savedTimelineToState, 
  debounce, 
  getTimelineStateHash,
  PersistenceState,
  initialPersistenceState,
  SaveStatus
} from '../../lib/timelinePersistence';

const defaultConfig: TimelineConfig = {
  pixelsPerFrame: 2,
  trackHeight: 60,
  rulerHeight: 30,
  snapThreshold: 5,
  minZoom: 0.1,  // Very zoomed out - can see hours of content
  maxZoom: 20,   // Very zoomed in - can see individual frames
};

const initialHistoryState = createHistoryState([], []);

const initialState: TimelineState = {
  tracks: [],
  playheadPosition: 0,
  totalDuration: 900, // 30 seconds at 30fps (will be dynamic)
  zoom: 2,
  fps: 30,
  selectedItems: [],
  isPlaying: false,
  history: {
    past: [],
    present: initialHistoryState,
    future: [],
  },
};

// History management for undo/redo
interface HistoryState {
  tracks: Track[];
  selectedItems: string[];
}

interface TimelineHistory {
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
}

type TimelineAction =
  | { type: 'ADD_TRACK' }
  | { type: 'REMOVE_TRACK'; trackId: string }
  | { type: 'REORDER_TRACKS'; fromIndex: number; toIndex: number }
  | { type: 'ADD_ITEM'; item: Omit<TimelineItem, 'id'> }
  | { type: 'UPDATE_ITEM'; itemId: string; updates: Partial<TimelineItem> }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'MOVE_ITEM'; itemId: string; trackId: string; startTime: number }
  | { type: 'SET_PLAYHEAD'; position: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'UPDATE_DURATION' }
  | { type: 'SELECT_ITEMS'; itemIds: string[] }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SPLIT_ITEM'; itemId: string; position: number }
  | { type: 'TRIM_ITEM'; itemId: string; start: number; end: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_TIMELINE'; timeline: Partial<TimelineState> };

// Helper function to calculate optimal timeline duration
function calculateOptimalDuration(tracks: Track[], zoom: number, fps: number): number {
  // Get the furthest end time of any content
  const allItems = tracks.flatMap(track => track.items);
  const contentEndTime = allItems.length > 0 
    ? Math.max(...allItems.map(item => item.startTime + item.duration))
    : 0;

  // Calculate minimum duration based on zoom level
  // When zoomed out, show more time; when zoomed in, show less
  const baseMinDuration = fps * 30; // 30 seconds minimum
  const zoomBasedDuration = fps * Math.max(30, 120 / zoom); // More time when zoomed out
  
  // Use the larger of: content end time + buffer, or zoom-based duration
  const contentWithBuffer = contentEndTime + (fps * 10); // 10 second buffer after content
  const finalDuration = Math.max(contentWithBuffer, zoomBasedDuration, baseMinDuration);
  
  // Round to nearest 5 seconds for cleaner timeline
  return Math.ceil(finalDuration / (fps * 5)) * (fps * 5);
}

// History helper functions
function createHistoryState(tracks: Track[], selectedItems: string[]): HistoryState {
  return {
    tracks: JSON.parse(JSON.stringify(tracks)), // Deep clone
    selectedItems: [...selectedItems],
  };
}

function pushHistory(history: TimelineHistory, newState: HistoryState): TimelineHistory {
  const maxHistorySize = 50; // Limit history size
  
  // Don't add to history if state hasn't changed
  if (JSON.stringify(history.present) === JSON.stringify(newState)) {
    return history;
  }
  
  const newPast = [...history.past, history.present];
  
  // Trim history if it gets too long
  if (newPast.length > maxHistorySize) {
    newPast.shift(); // Remove oldest entry
  }
  
  return {
    past: newPast,
    present: newState,
    future: [], // Clear future when new action is performed
  };
}

// Determine which actions should be tracked in history
function shouldTrackInHistory(action: TimelineAction): boolean {
  const historyActions = [
    'ADD_TRACK',
    'REMOVE_TRACK', 
    'REORDER_TRACKS',
    'ADD_ITEM',
    'UPDATE_ITEM',
    'REMOVE_ITEM',
    'MOVE_ITEM',
    'SPLIT_ITEM',
    'TRIM_ITEM',
  ];
  return historyActions.includes(action.type);
}

function timelineReducerCore(state: TimelineState, action: TimelineAction): TimelineState {
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

    case 'REORDER_TRACKS': {
      const newTracks = [...state.tracks];
      const [movedTrack] = newTracks.splice(action.fromIndex, 1);
      newTracks.splice(action.toIndex, 0, movedTrack);
      
      // Update track names to reflect new order
      const updatedTracks = newTracks.map((track, index) => ({
        ...track,
        name: `Track ${index + 1}`,
      }));
      
      return {
        ...state,
        tracks: updatedTracks,
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
        const updatedTracks = [...state.tracks, newTrack];
        
        return {
          ...state,
          tracks: updatedTracks,
          totalDuration: calculateOptimalDuration(updatedTracks, state.zoom, state.fps),
        };
      }

      const updatedTracks = state.tracks.map(track =>
        track.id === targetTrackId
          ? { ...track, items: [...track.items, newItem] }
          : track
      );
      
      return {
        ...state,
        tracks: updatedTracks,
        totalDuration: calculateOptimalDuration(updatedTracks, state.zoom, state.fps),
      };
    }

    case 'UPDATE_ITEM': {
      const updatedTracks = state.tracks.map(track => ({
        ...track,
        items: track.items.map(item =>
          item.id === action.itemId
            ? { ...item, ...action.updates }
            : item
        ),
      }));
      
      return {
        ...state,
        tracks: updatedTracks,
        totalDuration: calculateOptimalDuration(updatedTracks, state.zoom, state.fps),
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

      let finalTracks;
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

        finalTracks = [
          ...state.tracks.map(track => ({
            ...track,
            items: track.items.filter(i => i.id !== action.itemId),
          })),
          newTrack,
        ];
      } else {
        finalTracks = state.tracks.map(track => ({
          ...track,
          items: track.items
            .filter(item => item.id !== action.itemId)
            .concat(track.id === action.trackId ? [updatedItem] : []),
        }));
      }

      return {
        ...state,
        tracks: finalTracks,
        totalDuration: calculateOptimalDuration(finalTracks, state.zoom, state.fps),
      };
    }

    case 'SET_PLAYHEAD': {
      return {
        ...state,
        playheadPosition: Math.max(0, Math.min(action.position, state.totalDuration)),
      };
    }

    case 'SET_ZOOM': {
      const newZoom = Math.max(defaultConfig.minZoom, Math.min(action.zoom, defaultConfig.maxZoom));
      const newDuration = calculateOptimalDuration(state.tracks, newZoom, state.fps);
      return {
        ...state,
        zoom: newZoom,
        totalDuration: newDuration,
      };
    }

    case 'UPDATE_DURATION': {
      return {
        ...state,
        totalDuration: calculateOptimalDuration(state.tracks, state.zoom, state.fps),
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

    case 'UNDO': {
      if (!state.history || state.history.past.length === 0) {
        return state;
      }

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);

      return {
        ...state,
        tracks: previous.tracks,
        selectedItems: previous.selectedItems,
        totalDuration: calculateOptimalDuration(previous.tracks, state.zoom, state.fps),
        history: {
          past: newPast,
          present: previous,
          future: [state.history.present, ...state.history.future],
        },
      };
    }

    case 'REDO': {
      if (!state.history || state.history.future.length === 0) {
        return state;
      }

      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      return {
        ...state,
        tracks: next.tracks,
        selectedItems: next.selectedItems,
        totalDuration: calculateOptimalDuration(next.tracks, state.zoom, state.fps),
        history: {
          past: [...state.history.past, state.history.present],
          present: next,
          future: newFuture,
        },
      };
    }

    case 'LOAD_TIMELINE': {
      // Ensure we have valid data structure
      const tracks = (action.timeline.tracks || []).map(track => ({
        ...track,
        items: Array.isArray(track.items) ? track.items : [],
        height: typeof track.height === 'number' ? track.height : 60,
        id: track.id || uuidv4(),
        name: track.name || `Track ${(action.timeline.tracks || []).indexOf(track) + 1}`,
      }));

      const newHistory = createHistoryState(tracks, action.timeline.selectedItems || []);
      
      return {
        ...state,
        ...action.timeline,
        // Ensure essential fields have defaults and are valid
        tracks,
        selectedItems: action.timeline.selectedItems || [],
        playheadPosition: typeof action.timeline.playheadPosition === 'number' ? action.timeline.playheadPosition : 0,
        totalDuration: typeof action.timeline.totalDuration === 'number' ? action.timeline.totalDuration : 900,
        zoom: typeof action.timeline.zoom === 'number' ? action.timeline.zoom : 2,
        fps: typeof action.timeline.fps === 'number' ? action.timeline.fps : 30,
        isPlaying: false, // Always reset playing state when loading
        // Reset history when loading a timeline
        history: {
          past: [],
          present: newHistory,
          future: [],
        },
      };
    }

    default:
      return state;
  }
}

// Main reducer with history tracking
function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  // Handle undo/redo directly
  if (action.type === 'UNDO' || action.type === 'REDO') {
    return timelineReducerCore(state, action);
  }

  // Track history for certain actions
  if (shouldTrackInHistory(action) && state.history) {
    // Save current state to history before applying action
    const currentHistoryState = createHistoryState(state.tracks, state.selectedItems);
    const newHistory = pushHistory(state.history, currentHistoryState);
    
    // Apply the action
    const newState = timelineReducerCore(state, action);
    
    // Update history in the new state
    return {
      ...newState,
      history: {
        ...newHistory,
        present: createHistoryState(newState.tracks, newState.selectedItems),
      },
    };
  }

  // For non-history actions, just apply them directly
  return timelineReducerCore(state, action);
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

// Enhanced context type with persistence
interface EnhancedTimelineContextType extends TimelineContextType {
  persistence: PersistenceState;
  persistenceActions: {
    saveTimeline: (status?: 'draft' | 'manually_saved') => Promise<void>;
    loadTimeline: (projectId: string) => Promise<void>;
    enableAutoSave: (enabled: boolean) => void;
    markUnsaved: () => void;
  };
}

const TimelineContext = createContext<EnhancedTimelineContextType | null>(null);

interface TimelineProviderProps {
  children: ReactNode;
  projectId?: string | null;
}

export function TimelineProvider({ children, projectId }: TimelineProviderProps) {
  const [state, dispatch] = useReducer(timelineReducer, initialState);
  const [persistence, setPersistence] = useState<PersistenceState>(initialPersistenceState);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Track last saved state hash to detect changes
  const lastSavedHash = useRef<string>('');
  const isInitialized = useRef(false);

  // Save timeline function
  const saveTimeline = useCallback(async (status: 'draft' | 'manually_saved' = 'auto_saved') => {
    if (!projectId) {
      console.warn('Cannot save timeline: no project ID provided');
      return;
    }

    setPersistence(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const saveRequest = timelineStateToSaveRequest(state, status);
      const savedTimeline = await timelinePersistence.saveTimeline(projectId, saveRequest);
      
      const currentHash = getTimelineStateHash(state);
      lastSavedHash.current = currentHash;
      
      setPersistence(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        saveStatus: 'saved',
        version: savedTimeline.version,
      }));
      
      console.log('Timeline saved successfully');
    } catch (error) {
      console.error('Failed to save timeline:', error);
      setPersistence(prev => ({
        ...prev,
        isSaving: false,
        saveStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to save timeline',
      }));
    }
  }, [projectId, state]);

  // Load timeline function
  const loadTimeline = useCallback(async (targetProjectId: string) => {
    setPersistence(prev => ({ 
      ...prev, 
      isLoading: true, 
      isSaving: false, 
      error: null, 
      saveStatus: 'loading' 
    }));

    try {
      const savedTimeline = await timelinePersistence.loadTimeline(targetProjectId);
      
      if (savedTimeline) {
        const timelineState = savedTimelineToState(savedTimeline);
        dispatch({ type: 'LOAD_TIMELINE', timeline: timelineState });
        
        const currentHash = getTimelineStateHash({ ...state, ...timelineState } as TimelineState);
        lastSavedHash.current = currentHash;
        
        setPersistence(prev => ({
          ...prev,
          isLoading: false,
          isSaving: false,
          lastSaved: new Date(savedTimeline.lastSavedAt),
          hasUnsavedChanges: false,
          saveStatus: 'saved',
          version: savedTimeline.version,
        }));
        
        console.log('Timeline loaded successfully');
      } else {
        // No saved timeline found, initialize with default empty state
        console.log('No saved timeline found, initializing with default state');
        
        // Reset to clean initial state
        dispatch({ type: 'LOAD_TIMELINE', timeline: {
          tracks: [],
          selectedItems: [],
          playheadPosition: 0,
          totalDuration: 900, // 30 seconds at 30fps
          zoom: 2,
          fps: 30,
          isPlaying: false,
        }});
        
        lastSavedHash.current = getTimelineStateHash({
          tracks: [],
          selectedItems: [],
          playheadPosition: 0,
          totalDuration: 900,
          zoom: 2,
          fps: 30,
          isPlaying: false,
        } as TimelineState);
        
        setPersistence(prev => ({
          ...prev,
          isLoading: false,
          isSaving: false,
          saveStatus: 'saved',
          hasUnsavedChanges: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
      setPersistence(prev => ({
        ...prev,
        isLoading: false,
        isSaving: false,
        saveStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to load timeline',
      }));
    }
  }, [state]);

  // Auto-save with debouncing
  const debouncedSave = useCallback(
    debounce(() => {
      if (autoSaveEnabled && projectId) {
        saveTimeline('auto_saved');
      }
    }, 5000), // 5 second debounce
    [saveTimeline, autoSaveEnabled, projectId]
  );

  // Mark timeline as having unsaved changes
  const markUnsaved = useCallback(() => {
    setPersistence(prev => ({
      ...prev,
      hasUnsavedChanges: true,
      saveStatus: 'unsaved',
    }));
  }, []);

  // Auto-save effect - watch for state changes
  useEffect(() => {
    if (!isInitialized.current) return;

    const currentHash = getTimelineStateHash(state);
    if (currentHash !== lastSavedHash.current) {
      markUnsaved();
      if (autoSaveEnabled) {
        debouncedSave();
      }
    }
  }, [state, debouncedSave, autoSaveEnabled, markUnsaved]);

  // Initialize timeline when projectId changes
  useEffect(() => {
    if (projectId && !isInitialized.current) {
      loadTimeline(projectId).finally(() => {
        isInitialized.current = true;
      });
    }
  }, [projectId, loadTimeline]);

  // Keyboard shortcut for manual save (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (projectId) {
          saveTimeline('manually_saved');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveTimeline, projectId]);

  const actions = {
    addTrack: () => dispatch({ type: 'ADD_TRACK' }),
    removeTrack: (trackId: string) => dispatch({ type: 'REMOVE_TRACK', trackId }),
    reorderTracks: (fromIndex: number, toIndex: number) =>
      dispatch({ type: 'REORDER_TRACKS', fromIndex, toIndex }),
    addItem: (item: Omit<TimelineItem, 'id'>) => dispatch({ type: 'ADD_ITEM', item }),
    updateItem: (itemId: string, updates: Partial<TimelineItem>) =>
      dispatch({ type: 'UPDATE_ITEM', itemId, updates }),
    removeItem: (itemId: string) => dispatch({ type: 'REMOVE_ITEM', itemId }),
    moveItem: (itemId: string, trackId: string, startTime: number) =>
      dispatch({ type: 'MOVE_ITEM', itemId, trackId, startTime }),
    setPlayheadPosition: (position: number) => dispatch({ type: 'SET_PLAYHEAD', position }),
    setZoom: (zoom: number) => dispatch({ type: 'SET_ZOOM', zoom }),
    updateDuration: () => dispatch({ type: 'UPDATE_DURATION' }),
    selectItems: (itemIds: string[]) => dispatch({ type: 'SELECT_ITEMS', itemIds }),
    setPlaying: (playing: boolean) => dispatch({ type: 'SET_PLAYING', playing }),
    splitItem: (itemId: string, position: number) =>
      dispatch({ type: 'SPLIT_ITEM', itemId, position }),
    trimItem: (itemId: string, start: number, end: number) =>
      dispatch({ type: 'TRIM_ITEM', itemId, start, end }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  };

  const persistenceActions = {
    saveTimeline,
    loadTimeline,
    enableAutoSave: setAutoSaveEnabled,
    markUnsaved,
  };

  const contextValue: EnhancedTimelineContextType = {
    state,
    config: defaultConfig,
    actions,
    persistence,
    persistenceActions,
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

// Separate hook for persistence functionality
export function useTimelinePersistence() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimelinePersistence must be used within a TimelineProvider');
  }
  return {
    persistence: context.persistence,
    actions: context.persistenceActions,
  };
}