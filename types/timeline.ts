export enum MediaType {
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
  TEXT = 'text'
}

export interface TimelineItem {
  id: string;
  type: MediaType;
  name: string;
  startTime: number; // in frames
  duration: number; // in frames
  trackId: string;
  src?: string; // for media files
  content?: string; // for text items
  properties?: {
    // Cut segment properties for reconstruction
    isCutSegment?: boolean;
    originalItemId?: string;
    originalStartTime?: number; // Original start time in seconds
    originalEndTime?: number; // Original end time in seconds  
    originalDuration?: number; // Original duration in seconds
    originalName?: string; // Original item name
    segmentIndex?: number;
    totalSegments?: number;
    
    // Other properties
    [key: string]: any;
  };
}

export interface Transition {
  id: string;
  type: string; // 'fade', 'slide', 'wipe', etc.
  name: string;
  duration: number; // in frames
  fromItemId: string; // ID of the item this transition starts from
  toItemId: string; // ID of the item this transition goes to
  trackId: string;
  effect: any; // The actual Remotion transition effect
  position: number; // Position where transition starts (in frames)
}

export interface Track {
  id: string;
  name: string;
  items: TimelineItem[];
  transitions: Transition[];
  height: number;
  muted?: boolean;
  locked?: boolean;
}

export interface DetectedCut {
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

export interface TimelineState {
  tracks: Track[];
  playheadPosition: number; // in frames
  totalDuration: number; // in frames
  zoom: number; // pixels per frame
  fps: number;
  selectedItems: string[];
  isPlaying: boolean;
  cuts: DetectedCut[]; // Add cuts to timeline state
  cutsLoading: boolean; // Track loading state
  currentVideoId: string | null; // Track current video
  history?: {
    past: { tracks: Track[]; selectedItems: string[] }[];
    present: { tracks: Track[]; selectedItems: string[] };
    future: { tracks: Track[]; selectedItems: string[] }[];
  };
}

export interface DragItem {
  id: string;
  type: 'timeline-item';
  item: TimelineItem;
  originalTrackId: string;
}

export interface DropResult {
  trackId: string;
  position: number; // in frames
}

export interface TimelineConfig {
  pixelsPerFrame: number;
  trackHeight: number;
  rulerHeight: number;
  snapThreshold: number; // in frames
  minZoom: number;
  maxZoom: number;
}

export interface TimelineContextType {
  state: TimelineState;
  config: TimelineConfig;
  actions: {
    addTrack: () => void;
    removeTrack: (trackId: string) => void;
    reorderTracks: (fromIndex: number, toIndex: number) => void;
    addItem: (item: Omit<TimelineItem, 'id'>) => void;
    updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
    removeItem: (itemId: string) => void;
    moveItem: (itemId: string, trackId: string, startTime: number) => void;
    addTransition: (transition: Omit<Transition, 'id'>) => void;
    removeTransition: (transitionId: string) => void;
    updateTransition: (transitionId: string, updates: Partial<Transition>) => void;
    setPlayheadPosition: (position: number) => void;
    setZoom: (zoom: number) => void;
    updateDuration: () => void;
    selectItems: (itemIds: string[]) => void;
    setPlaying: (playing: boolean) => void;
    splitItem: (itemId: string, position: number) => void;
    trimItem: (itemId: string, start: number, end: number) => void;
    clearTimeline: () => void;
    undo: () => void;
    redo: () => void;
    // Cut management actions
    fetchCuts: (videoId: string) => Promise<void>;
    applyCut: (cutId: string) => Promise<void>;
    restoreCut: (cutId: string) => Promise<void>;
    applyAllCuts: () => Promise<void>;
    restoreAllCuts: () => Promise<void>;
    setCurrentVideoId: (videoId: string | null) => void;
  };
}