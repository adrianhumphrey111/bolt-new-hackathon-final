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
  properties?: Record<string, any>;
}

export interface Track {
  id: string;
  name: string;
  items: TimelineItem[];
  height: number;
  muted?: boolean;
  locked?: boolean;
}

export interface TimelineState {
  tracks: Track[];
  playheadPosition: number; // in frames
  totalDuration: number; // in frames
  zoom: number; // pixels per frame
  fps: number;
  selectedItems: string[];
  isPlaying: boolean;
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
  };
}