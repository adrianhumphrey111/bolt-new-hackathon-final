"use client";

import React, { useState, useRef, useCallback, useEffect, useContext, createContext } from 'react';
import { MediaType } from '../../../types/timeline';
import { useTimeline } from './TimelineContext';
import { uploadToS3, deleteFromS3 } from '../../../lib/s3Upload';
import { convertMedia } from '@remotion/webcodecs';
import { createClientSupabaseClient } from '../../lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useVideoProcessing } from '../../hooks/useVideoProcessing';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { AIVideoSorter } from './AIVideoSorter';
import { useDrag } from './DragContext';
import { StoragePaywallModal } from '../StoragePaywallModal';
import { PaywallModal } from '../PaywallModal';
import { VideoAnalysisModal } from './VideoAnalysisModal';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { iris } from '@remotion/transitions/iris';
import { none } from '@remotion/transitions/none';
import { VideoProcessingFlow, VideoProcessingFlowMethods } from './VideoProcessingFlow';

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  src?: string;
  duration?: number; // in frames
  thumbnail?: string;
  file_path?: string;
  file_name?: string; // The filename in storage
  original_name?: string;
  isAnalyzing?: boolean; // New property for AI analysis status
  processingInfo?: any; // Processing information from useVideoProcessing hook
}

interface TransitionItem {
  id: string;
  name: string;
  description: string;
  type: 'transition';
  effect: any;
  duration: number; // in frames
  category: 'basic' | 'premium';
}

type TabType = 'media' | 'transitions' | 'ai-sort' | 'script';

// Create context for project information
interface ProjectContextType {
  projectId: string | null;
}

const ProjectContext = createContext<ProjectContextType>({ projectId: null });

export function useProject() {
  return useContext(ProjectContext);
}

export function ProjectProvider({ projectId, children }: { projectId: string | null; children: React.ReactNode }) {
  return (
    <ProjectContext.Provider value={{ projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

// Sample media items removed - now fetching from project videos

// File size constants
const MAX_TRANSCODE_SIZE = 300 * 1024 * 1024; // 300MB in bytes - MOV files above this skip frontend conversion
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB - files above this use multipart upload

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  videoName: string;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, videoName, isDeleting }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-600">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Delete Video</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete
          </p>
          <p className="text-white font-medium bg-gray-700 px-3 py-2 rounded mb-3 break-all">
            "{videoName}"
          </p>
          <p className="text-gray-400 text-sm">
            This action cannot be undone and will permanently remove the video from your project and storage.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-60 flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Video'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaLibrary() {
  const { state, actions } = useTimeline();
  const { projectId } = useProject();
  const { setIsTransitionDragging } = useDrag();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [projectVideos, setProjectVideos] = useState<MediaItem[]>([]);
  const [uploadedItems, setUploadedItems] = useState<MediaItem[]>([]);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [isScriptSaving, setIsScriptSaving] = useState(false);
  const [scriptLastSaved, setScriptLastSaved] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{[key: string]: number}>({});
  const [isConverting, setIsConverting] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<{[key: string]: boolean}>({});
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    videoId: string;
    fileName: string;
    videoName: string;
  }>({
    isOpen: false,
    videoId: '',
    fileName: '',
    videoName: '',
  });
  const [analysisPanel, setAnalysisPanel] = useState<{
    isOpen: boolean;
    videoId: string;
    videoName: string;
    videoSrc?: string;
  }>({
    isOpen: false,
    videoId: '',
    videoName: '',
    videoSrc: undefined,
  });
  const [storagePaywall, setStoragePaywall] = useState<{
    isOpen: boolean;
    currentStorageGB: number;
    storageLimit: number;
    fileSize: number;
  }>({
    isOpen: false,
    currentStorageGB: 0,
    storageLimit: 2,
    fileSize: 0,
  });
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [analysisModal, setAnalysisModal] = useState<{
    isOpen: boolean;
    file: File | null;
    analysisType: 'full' | 'sample' | null;
  }>({
    isOpen: false,
    file: null,
    analysisType: null,
  });
  const [creditsPaywall, setCreditsPaywall] = useState<{
    isOpen: boolean;
    requiredCredits: number;
    availableCredits: number;
    action: string;
  }>({
    isOpen: false,
    requiredCredits: 0,
    availableCredits: 0,
    action: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoProcessingFlowRef = useRef<VideoProcessingFlowMethods>(null);
  const supabase = createClientSupabaseClient();
  
  // Use video processing hook for real-time status tracking
  const {
    isProcessing,
    processingVideos,
    currentProcessingVideo,
    error: processingError,
    formatElapsedTime,
    isVideoProcessing,
    getVideoProcessingInfo,
    startMonitoring
  } = useVideoProcessing(projectId);

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [supabase]);

  // Fetch project videos via API
  const fetchProjectVideos = useCallback(async () => {
    if (!projectId || fetchingRef.current || loadedProjectId === projectId) return;

    fetchingRef.current = true;
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/videos?project_id=${projectId}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication failed when fetching videos');
          return; // Stop retrying to prevent infinite loop
        }
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const { videos } = await response.json();

      const mediaItems: MediaItem[] = videos.map(video => {
        let videoUrl = video.file_path;
        
        console.log('🎥 Processing video from DB:', {
          id: video.id,
          name: video.original_name,
          file_path: video.file_path,
          file_name: video.file_name
        });
        
        if (video.file_path && video.file_path.startsWith('http')) {
          videoUrl = video.file_path;
          console.log('✅ Using existing HTTP URL:', videoUrl);
        } else if (video.file_path) {
          const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET;
          console.log('🔧 S3 Bucket Name:', bucketName);
          if (bucketName) {
            videoUrl = `https://${bucketName}.s3.amazonaws.com/${video.file_path}`;
            console.log('🔗 Constructed S3 URL:', videoUrl);
          } else {
            console.warn('❌ NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET is not set. Cannot construct S3 URL.');
            videoUrl = undefined;
          }
        } else {
          console.warn('❌ No file_path found for video:', video.id);
          videoUrl = undefined;
        }
        
        // Determine if video is still analyzing using the processing hook
        const isAnalyzing = isVideoProcessing(video.id);
        const processingInfo = getVideoProcessingInfo(video.id);

        return {
          id: video.id,
          name: video.original_name,
          type: MediaType.VIDEO,
          src: videoUrl,
          duration: video.duration ? Math.round(video.duration * state.fps) : 150,
          thumbnail: video.thumbnail_url,
          file_path: video.file_path,
          file_name: video.file_name,
          original_name: video.original_name,
          isAnalyzing: isAnalyzing,
          processingInfo: processingInfo,
        };
      });

      setProjectVideos(mediaItems);
      setLoadedProjectId(projectId);
    } catch (error) {
      console.error('Error fetching project videos:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [projectId, supabase, state.fps, isVideoProcessing, getVideoProcessingInfo]); // Include necessary functions

  // Reset loaded state when projectId changes
  useEffect(() => {
    if (projectId !== loadedProjectId) {
      setLoadedProjectId(null);
      fetchingRef.current = false;
    }
  }, [projectId, loadedProjectId]);

  // Load project videos on mount and when projectId changes
  useEffect(() => {
    if (projectId && loadedProjectId !== projectId) {
      fetchProjectVideos();
    }
  }, [projectId, loadedProjectId, fetchProjectVideos]);

  // Load script content when project changes
  const fetchScriptContent = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('storyboard_content')
        .select('text_content')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching script content:', error);
        return;
      }

      setScriptContent(data?.text_content || '');
    } catch (error) {
      console.error('Error fetching script content:', error);
    }
  }, [projectId, supabase]);

  // Save script content to database
  const saveScriptContent = useCallback(async (content: string) => {
    if (!projectId || isScriptSaving) return;

    setIsScriptSaving(true);
    try {
      const { error } = await supabase
        .from('storyboard_content')
        .upsert({
          project_id: projectId,
          text_content: content,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving script content:', error);
        return;
      }

      setScriptLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving script content:', error);
    } finally {
      setIsScriptSaving(false);
    }
  }, [projectId, supabase, isScriptSaving]);

  // Load script content when project changes
  useEffect(() => {
    if (projectId && loadedProjectId !== projectId) {
      fetchScriptContent();
    }
  }, [projectId, loadedProjectId, fetchScriptContent]);

  // Debounced save function for script content
  const debouncedSaveScript = useCallback((content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveScriptContent(content);
    }, 2000);
  }, [saveScriptContent]);

  // Handle script content change
  const handleScriptChange = useCallback((content: string) => {
    setScriptContent(content);
    debouncedSaveScript(content);
  }, [debouncedSaveScript]);

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.VIDEO:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case MediaType.AUDIO:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.792L5.5 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.5l2.883-2.792zM15 8.75a1.25 1.25 0 00-2.5 0v2.5a1.25 1.25 0 002.5 0v-2.5z" clipRule="evenodd" />
          </svg>
        );
      case MediaType.IMAGE:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case MediaType.TEXT:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v10h8V6H6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getMediaColor = (type: MediaType) => {
    switch (type) {
      case MediaType.VIDEO:
        return 'text-blue-400';
      case MediaType.AUDIO:
        return 'text-green-400';
      case MediaType.IMAGE:
        return 'text-purple-400';
      case MediaType.TEXT:
        return 'text-orange-400';
    }
  };

  const handleVideoClick = (mediaItem: MediaItem) => {
    if (mediaItem.type === MediaType.VIDEO && projectVideos.some(video => video.id === mediaItem.id)) {
      // Check if video is still analyzing
      if (mediaItem.isAnalyzing) {
        alert('This video is currently being analyzed. Please check back in a few moments to view the AI analysis.');
        return;
      }
      
      // Open AI Analysis panel for project videos
      setAnalysisPanel({
        isOpen: true,
        videoId: mediaItem.id,
        videoName: mediaItem.name,
        videoSrc: mediaItem.src,
      });
    } else {
      // Add non-video items or uploaded items to timeline
      handleAddToTimeline(mediaItem);
    }
  };

  const handleAddToTimeline = (mediaItem: MediaItem) => {
    // Find an available track or create a new one
    let targetTrackId = '';
    
    if (state.tracks.length > 0) {
      // Try to find a track with space at the playhead position
      const availableTrack = state.tracks.find(track => {
        const hasOverlap = track.items.some(item => {
          const itemEnd = item.startTime + item.duration;
          const newItemEnd = state.playheadPosition + (mediaItem.duration || 90);
          return !(state.playheadPosition >= itemEnd || newItemEnd <= item.startTime);
        });
        return !hasOverlap;
      });
      
      if (availableTrack) {
        targetTrackId = availableTrack.id;
      }
    }
    
    // If no available track found, will create new one in reducer
    if (!targetTrackId && state.tracks.length > 0) {
      targetTrackId = state.tracks[0].id; // This will trigger auto-track creation
    } else if (!targetTrackId) {
      // Create first track
      actions.addTrack();
      // We'll need to get the track ID after it's created
      // For now, we'll use a placeholder and the reducer will handle it
      targetTrackId = 'new-track';
    }

    actions.addItem({
      type: mediaItem.type,
      name: mediaItem.name,
      startTime: state.playheadPosition,
      duration: mediaItem.duration || 90, // Default 3 seconds
      trackId: targetTrackId,
      src: mediaItem.src,
      content: mediaItem.type === MediaType.TEXT ? 'Sample Text' : undefined,
    });
  };

  const handleDragStart = (e: React.DragEvent, mediaItem: MediaItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'media-item',
      item: mediaItem,
    }));
  };

  const handleAddTransitionToTimeline = (transition: TransitionItem) => {
    // For now, we'll just log that a transition was selected
    // The actual placement will be handled by the track drop zones
    console.log('Transition selected for placement:', transition.name);
    alert(`Selected ${transition.name} transition. Drag it between two clips on the timeline to create a transition.`);
  };

  const handleTransitionDragStart = (e: React.DragEvent, transition: TransitionItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'transition-item',
      item: transition,
    }));

    // Set global drag state
    setIsTransitionDragging(true);

    // Create a custom drag image that looks like a slim transition bar
    const dragImage = document.createElement('div');
    dragImage.style.width = '120px';
    dragImage.style.height = '24px';
    dragImage.style.background = 'linear-gradient(to right, #8b5cf6, #3b82f6)';
    dragImage.style.borderRadius = '12px';
    dragImage.style.color = 'white';
    dragImage.style.fontSize = '12px';
    dragImage.style.fontWeight = 'bold';
    dragImage.style.display = 'flex';
    dragImage.style.alignItems = 'center';
    dragImage.style.justifyContent = 'center';
    dragImage.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.innerHTML = transition.name;
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 60, 12);
    
    // Clean up the drag image after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleTransitionDragEnd = () => {
    setIsTransitionDragging(false);
  };

  const getMediaTypeFromFile = (file: File): MediaType => {
    const type = file.type.toLowerCase();
    if (type.startsWith('video/')) return MediaType.VIDEO;
    if (type.startsWith('audio/')) return MediaType.AUDIO;
    if (type.startsWith('image/')) return MediaType.IMAGE;
    return MediaType.TEXT; // Default fallback
  };

  const estimateDurationFromFile = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      // Skip duration estimation for large files (> 500MB) to avoid browser decoder errors
      const LARGE_FILE_SIZE_LIMIT = 500 * 1024 * 1024; // 500MB
      
      if (file.size > LARGE_FILE_SIZE_LIMIT) {
        console.log(`Skipping duration estimation for large file (${formatFileSize(file.size)}):`, file.name);
        resolve(3000); // Default 100 seconds (3000 frames at 30fps) for large videos
        return;
      }
      
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
        media.preload = 'metadata';
        
        // Set timeout to prevent hanging on problematic files
        const timeout = setTimeout(() => {
          console.log('Duration estimation timeout for:', file.name);
          resolve(90); // Default 3 seconds
          URL.revokeObjectURL(media.src);
        }, 10000); // 10 second timeout
        
        media.onloadedmetadata = () => {
          clearTimeout(timeout);
          const durationInFrames = Math.round(media.duration * state.fps);
          resolve(durationInFrames);
          URL.revokeObjectURL(media.src);
        };
        
        media.onerror = (error) => {
          clearTimeout(timeout);
          console.log('Error estimating duration for:', file.name, error);
          resolve(90); // Default 3 seconds
          URL.revokeObjectURL(media.src);
        };
        
        try {
          media.src = URL.createObjectURL(file);
        } catch (error) {
          clearTimeout(timeout);
          console.log('Error creating object URL for:', file.name, error);
          resolve(90); // Default 3 seconds
        }
      } else {
        resolve(90); // Default 3 seconds for images and other files
      }
    });
  };

  const convertMovToMp4 = async (file: File, itemId: string): Promise<File> => {
    console.log('🔄 Converting .mov to .mp4:', file.name);
    
    setIsConverting(prev => ({ ...prev, [itemId]: true }));
    setConversionProgress(prev => ({ ...prev, [itemId]: 0 }));

    try {
      const mp4Result = await convertMedia({
        src: file,
        container: 'mp4',
        onProgress: (progress) => {
          // Check if progress has a progress property, otherwise use the value directly
          const progressValue = typeof progress === 'object' && 'progress' in progress 
            ? (progress as any).progress 
            : progress;
          setConversionProgress(prev => ({ ...prev, [itemId]: progressValue * 100 }));
        },
      });

      const mp4Blob = await mp4Result.save()

      console.log('DEBUG: convertMovToMp4 - mp4Blob size:', mp4Blob.size, 'bytes');
      console.log('DEBUG: convertMovToMp4 - mp4Blob type:', mp4Blob.type);
      const mp4File = new File([mp4Blob], file.name.replace(/\.mov$/i, '.mp4'), {
        type: 'video/mp4',
      });
      
      console.log('✅ Conversion completed for:', file.name);
      console.log('DEBUG: convertMovToMp4 - Transcoded file size:', mp4File.size, 'bytes');
      return mp4File;
    } catch (error) {
      console.error('❌ Error during MOV to MP4 conversion:', error);
      console.log('DEBUG: convertMovToMp4 - Caught error object:', error);
      throw error;
    } finally {
      setIsConverting(prev => ({ ...prev, [itemId]: false }));
      setConversionProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[itemId];
        return newProgress;
      });
    }
  };

  const isValidVideoFile = (file: File): boolean => {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension === 'mov' || extension === 'mp4' || file.type === 'video/mp4' || file.type === 'video/quicktime';
  };

  const shouldTranscodeFile = (file: File): boolean => {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension === 'mov' && file.size <= MAX_TRANSCODE_SIZE;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const saveVideoToProject = useCallback(async (file: File, duration: number, startAnalysis: boolean = true, analysisType: 'full' | 'sample' = 'full'): Promise<string | null> => {
    if (!projectId) {
      console.error('No project ID available for video upload');
      return null;
    }

    const videoId = uuidv4(); // Generate a unique ID for the video

    try {
      // Add to uploading videos in processing flow
      if (videoProcessingFlowRef.current) {
        videoProcessingFlowRef.current.addUploadingVideo({
          id: videoId,
          name: file.name,
          size: file.size,
          progress: 0,
          status: 'uploading'
        });
      }

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No user session available');
        if (videoProcessingFlowRef.current) {
          videoProcessingFlowRef.current.markUploadFailed(videoId);
        }
        return null;
      }

      const userId = session.user.id;
      const timestamp = Date.now();
      const originalName = file.name;
      const fileName = `${userId}/${projectId}/videos/${videoId}_${timestamp}_${originalName}`;
      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET as string;

      // Save video record to database with file size
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          id: videoId, // Use the generated UUID as the video ID
          project_id: projectId,
          file_name: fileName,
          original_name: originalName,
          file_path: fileName, // Store the S3 key directly
          duration: duration / state.fps, // Convert frames to seconds
          status: 'processing',
          file_size_bytes: file.size // Track file size in bytes
        })
        .select()
        .single();

      if (dbError) {
        if (videoProcessingFlowRef.current) {
          videoProcessingFlowRef.current.markUploadFailed(videoId);
        }
        throw dbError;
      }

      console.log('✅ Video saved to project:', videoData);
      
      console.log('DEBUG: saveVideoToProject - File to upload to S3:', file);
      console.log('DEBUG: saveVideoToProject - File to upload to S3 size:', file.size, 'bytes');
      console.log('DEBUG: saveVideoToProject - File to upload to S3 type:', file.type);
      
      // Now upload to S3 with progress tracking
      await uploadToS3({ 
        file, 
        fileName, 
        bucketName,
        onProgress: (progress) => {
          // Update progress in both old and new systems for now
          setUploadProgress(prev => ({ ...prev, [videoId]: progress }));
          if (videoProcessingFlowRef.current) {
            videoProcessingFlowRef.current.updateUploadProgress(videoId, progress);
          }
        }
      });

      // Mark upload complete
      if (videoProcessingFlowRef.current) {
        videoProcessingFlowRef.current.markUploadComplete(videoId);
      }
      
      // Start video analysis immediately
      try {
        const headers = await getAuthHeaders();
        const analysisResponse = await fetch(`/api/videos/${videoId}/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            analysisType: analysisType,
            fileSize: file.size
          })
        });
        
        if (!analysisResponse.ok) {
          console.warn('Failed to start video analysis');
        } else {
          const result = await analysisResponse.json();
          console.log('✅ Video analysis started:', result);
        }
      } catch (error) {
        console.warn('Error starting video analysis:', error);
      }
      
      // Deduct 10 credits for video upload
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/user/usage/deduct', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'video_upload',
            credits: 10
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to deduct credits for video upload');
        } else {
          console.log('✅ Deducted 10 credits for video upload');
        }
      } catch (error) {
        console.warn('Error deducting credits:', error);
      }
      
      return videoId; // Return video ID instead of fileName
    } catch (error) {
      console.error('Error saving video to project:', error);
      if (videoProcessingFlowRef.current) {
        videoProcessingFlowRef.current.markUploadFailed(videoId);
      }
      return null;
    }
  }, [projectId, supabase, state.fps, getAuthHeaders]);

  const deleteVideoFromProject = useCallback(async (videoId: string, s3Key: string): Promise<boolean> => {
    setDeleting(prev => ({ ...prev, [videoId]: true }));
    
    try {
      // First, delete related shot list items (they have ON DELETE RESTRICT)
      const { error: shotListError } = await supabase
        .from('shot_list_items')
        .delete()
        .eq('video_id', videoId);

      if (shotListError) {
        console.warn('Failed to delete shot list items:', shotListError);
        // Continue anyway - this table might not exist in all environments
      }

      // Then, delete the video from database
      // (video_analysis and timeline_clips will be handled automatically by their CASCADE/SET NULL constraints)
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (dbError) throw dbError;

      // Finally, delete from storage
      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET as string;
      try {
        await deleteFromS3(s3Key, bucketName);
      } catch (storageError) {
        console.warn('Failed to delete file from S3 storage:', storageError);
        // Don't throw here since database deletion succeeded
      }

      console.log('✅ Video deleted successfully:');
      
      // Remove from UI immediately
      setProjectVideos(prev => prev.filter(video => video.id !== videoId));
      
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    } finally {
      setDeleting(prev => ({ ...prev, [videoId]: false }));
    }
  }, [supabase, fetchProjectVideos]);

  const isValidFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Video files: only MP4 and MOV
    if (fileType.startsWith('video/')) {
      return fileName.endsWith('.mp4') || fileName.endsWith('.mov') || 
             fileType === 'video/mp4' || fileType === 'video/quicktime';
    }
    
    // Audio files: common formats
    if (fileType.startsWith('audio/')) {
      return fileName.endsWith('.mp3') || fileName.endsWith('.wav') || 
             fileName.endsWith('.m4a') || fileName.endsWith('.aac') ||
             fileType === 'audio/mpeg' || fileType === 'audio/wav' || 
             fileType === 'audio/mp4' || fileType === 'audio/aac';
    }
    
    // Image files: common formats
    if (fileType.startsWith('image/')) {
      return fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
             fileName.endsWith('.png') || fileName.endsWith('.gif') ||
             fileName.endsWith('.webp') || fileName.endsWith('.bmp') ||
             fileType === 'image/jpeg' || fileType === 'image/png' || 
             fileType === 'image/gif' || fileType === 'image/webp';
    }
    
    return false;
  };

  // Check storage and credits before upload
  const checkUploadLimits = async (file: File): Promise<{ canUpload: boolean; reason?: string }> => {
    try {
      const headers = await getAuthHeaders();
      
      // Check current usage
      const usageResponse = await fetch('/api/user/usage', { headers });
      if (!usageResponse.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const usage = await usageResponse.json();
      
      // Check storage limit
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      const totalAfterUpload = usage.storageUsed + fileSizeGB;
      
      if (totalAfterUpload > usage.storageLimit) {
        setStoragePaywall({
          isOpen: true,
          currentStorageGB: usage.storageUsed,
          storageLimit: usage.storageLimit,
          fileSize: file.size,
        });
        return { canUpload: false, reason: 'storage_limit' };
      }
      
      // Check credits for video uploads (10 credits)
      if (file.type.startsWith('video/')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const creditsResponse = await fetch('/api/user/credits', { headers });
          if (creditsResponse.ok) {
            const credits = await creditsResponse.json();
            if (credits.remaining < 10) {
              setCreditsPaywall({
                isOpen: true,
                requiredCredits: 10,
                availableCredits: credits.remaining,
                action: 'upload video',
              });
              return { canUpload: false, reason: 'insufficient_credits' };
            }
          }
        }
      }
      
      return { canUpload: true };
    } catch (error) {
      console.error('Error checking upload limits:', error);
      return { canUpload: true }; // Allow upload if check fails
    }
  };

  const handleFileUpload = useCallback(async (files: FileList, analysisType?: 'full' | 'sample') => {
    console.log('🚀 UPLOAD DEBUG: handleFileUpload started with', files.length, 'files');
    
    // Support bulk upload - process up to 20 files
    const filesToProcess = Array.from(files).slice(0, 20);
    console.log('🚀 UPLOAD DEBUG: Processing', filesToProcess.length, 'files');
    
    // Check if we have video files and need to show analysis modal
    const videoFiles = filesToProcess.filter(file => file.type.startsWith('video/'));
    console.log('🚀 UPLOAD DEBUG: Found', videoFiles.length, 'video files');
    
    if (videoFiles.length > 0 && !analysisType) {
      console.log('🚀 UPLOAD DEBUG: Showing analysis modal for first video');
      // Show analysis modal for the first video file
      const firstVideoFile = videoFiles[0];
      setAnalysisModal({
        isOpen: true,
        file: firstVideoFile,
        analysisType: null,
      });
      return;
    }
    
    console.log('🚀 UPLOAD DEBUG: Setting uploading state to true');
    setUploading(true);
    
    if (filesToProcess.length > 1) {
      console.log(`🎬 Bulk upload: Processing ${filesToProcess.length} files`);
    }
    
    // Track upload progress for each file
    const uploadProgress: Record<string, number> = {};
    const uploadStatuses: Record<string, 'uploading' | 'queued' | 'failed'> = {};
    
    try {
      // Process each file
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
      console.log('DEBUG: handleFileUpload - Initial file:', file);
      
      // Check upload limits before proceeding
      const { canUpload, reason } = await checkUploadLimits(file);
      if (!canUpload) {
        console.log('Upload blocked:', reason);
        // Store the pending files for re-upload after upgrade
        setPendingUploadFiles(filesToProcess);
        setUploading(false);
        return;
      }
      console.log('DEBUG: handleFileUpload - Initial file size:', file.size, 'bytes');
      console.log('DEBUG: handleFileUpload - Initial file type:', file.type);
      
      // Validate file type
      if (!isValidFileType(file)) {
        const fileType = file.type.startsWith('video/') ? 'video' : 
                        file.type.startsWith('audio/') ? 'audio' : 
                        file.type.startsWith('image/') ? 'image' : 'file';
        alert(`Invalid ${fileType} format. \n\nSupported formats:\n• Videos: MP4, MOV\n• Audio: MP3, WAV, M4A, AAC\n• Images: JPG, PNG, GIF, WebP`);
        return;
      }
      
      const mediaType = getMediaTypeFromFile(file);
      const duration = await estimateDurationFromFile(file);
      const itemId = `upload-${Date.now()}`;
      
      let objectUrl: string;
      let finalName = file.name;
      let fileToUpload = file; // Track which file to upload (original or transcoded)
      
      // Check MOV files for transcoding based on size
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'mov') {
        const fileSize = formatFileSize(file.size);
        
        if (shouldTranscodeFile(file)) {
          console.log(`🔄 Small MOV file (${fileSize}) detected, transcoding to MP4 on frontend:`, file.name);
          try {
            const transcodedFile = await convertMovToMp4(file, itemId);
            console.log('DEBUG: handleFileUpload - Transcoded file returned from convertMovToMp4:', transcodedFile);
            console.log('DEBUG: handleFileUpload - Transcoded file size from convertMovToMp4:', transcodedFile.size, 'bytes');
            objectUrl = URL.createObjectURL(transcodedFile);
            finalName = transcodedFile.name;
            fileToUpload = transcodedFile;
          } catch (error) {
            console.error('❌ Frontend conversion failed, uploading original MOV for backend conversion:', error);
            // If frontend conversion fails, upload original and let backend handle it
            objectUrl = URL.createObjectURL(file);
            fileToUpload = file;
          }
        } else {
          console.log(`📁 Large MOV file (${fileSize}) detected, skipping frontend conversion - will convert on backend:`, file.name);
          objectUrl = URL.createObjectURL(file);
          // Keep original filename and file for upload - backend will handle conversion
        }
      } else {
        objectUrl = URL.createObjectURL(file);
      }
      
      // If we have a project, save to database (video will be managed by processing flow)
      if (projectId && mediaType === MediaType.VIDEO) {
        console.log('DEBUG: handleFileUpload - File being sent to saveVideoToProject:', fileToUpload);
        console.log('DEBUG: handleFileUpload - File being sent to saveVideoToProject size:', fileToUpload.size, 'bytes');
        console.log('DEBUG: handleFileUpload - File being sent to saveVideoToProject type:', fileToUpload.type);
        const videoId = await saveVideoToProject(fileToUpload, duration, i === 0, analysisType || 'full'); // Only trigger analysis for first file
        if (videoId) {
          console.log('✅ Video uploaded and saved to project - now being tracked by processing flow');
          
          // Don't add to projectVideos immediately - let the processing flow handle it
          // The video will appear in "Being Analyzed" section and move to "Ready to Use" when complete
          
          // Start monitoring for processing status
          startMonitoring();
        }
      }
      
      // If not saved to project (e.g., no projectId), add to temporary uploaded items
      if (!projectId || mediaType !== MediaType.VIDEO) {
        const newItem: MediaItem = {
          id: itemId,
          name: finalName,
          type: mediaType,
          src: objectUrl,
          duration,
        };
        setUploadedItems(prev => [...prev, newItem]);
      }
      } // End of for loop
    } catch (error) {
      console.error('Error during file upload:', error);
    } finally {
      setUploading(false);
      setUploadProgress({}); // Clear upload progress
    }
  }, [state.fps, projectId, saveVideoToProject, startMonitoring]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleAnalysisConfirm = useCallback((analysisType: 'full' | 'sample') => {
    if (analysisModal.file) {
      // Create a FileList-like object with the single file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(analysisModal.file);
      
      // Process the file with the selected analysis type
      handleFileUpload(dataTransfer.files, analysisType);
    }
    
    setAnalysisModal({
      isOpen: false,
      file: null,
      analysisType: null,
    });
  }, [analysisModal.file, handleFileUpload]);

  const handleAnalysisClose = useCallback(() => {
    setAnalysisModal({
      isOpen: false,
      file: null,
      analysisType: null,
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeUploadedItem = useCallback((itemId: string) => {
    setUploadedItems(prev => {
      const item = prev.find(item => item.id === itemId);
      if (item?.src) {
        URL.revokeObjectURL(item.src);
      }
      return prev.filter(item => item.id !== itemId);
    });
  }, []);

  const handleDeleteProjectVideo = useCallback((e: React.MouseEvent, videoId: string, s3Key: string, videoName: string) => {
    e.stopPropagation();
    
    setDeleteModal({
      isOpen: true,
      videoId,
      fileName: s3Key,
      videoName,
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteModal.videoId) return;
    
    const success = await deleteVideoFromProject(deleteModal.videoId, deleteModal.fileName);
    
    if (success) {
      setDeleteModal({ isOpen: false, videoId: '', fileName: '', videoName: '' });
    } else {
      // Keep modal open and show error - you could add error state here
      alert('Failed to delete video. Please try again.');
    }
  }, [deleteModal, deleteVideoFromProject]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, videoId: '', fileName: '', videoName: '' });
  }, []);

  const handleCloseAnalysisPanel = useCallback(() => {
    setAnalysisPanel({ isOpen: false, videoId: '', videoName: '', videoSrc: undefined });
  }, []);

  // Handle when a video completes analysis and should be added to the main videos list
  const handleVideoCompleted = useCallback((completedVideo: { id: string; original_name: string; file_path: string; duration?: number; }) => {
    console.log('✅ Video analysis completed, adding to videos list:', completedVideo);
    
    // Create URL for the video
    let videoUrl = completedVideo.file_path;
    if (completedVideo.file_path && !completedVideo.file_path.startsWith('http')) {
      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET;
      if (bucketName) {
        videoUrl = `https://${bucketName}.s3.amazonaws.com/${completedVideo.file_path}`;
      }
    }
    
    const newVideoItem: MediaItem = {
      id: completedVideo.id,
      name: completedVideo.original_name,
      type: MediaType.VIDEO,
      src: videoUrl,
      duration: completedVideo.duration || 150,
      thumbnail: undefined,
      file_path: completedVideo.file_path,
      original_name: completedVideo.original_name,
      isAnalyzing: false,
    };
    
    setProjectVideos(prev => {
      // Check if video already exists to avoid duplicates
      const exists = prev.some(video => video.id === completedVideo.id);
      if (exists) {
        return prev;
      }
      return [...prev, newVideoItem];
    });
  }, []);

  // Combine project videos and uploaded items
  const allMediaItems = [...projectVideos, ...uploadedItems];

  // Available transitions
  const availableTransitions: TransitionItem[] = [
    {
      id: 'fade',
      name: 'Fade',
      description: 'Animate the opacity of the scenes',
      type: 'transition',
      effect: fade,
      duration: 30, // 1 second at 30fps
      category: 'basic'
    },
    {
      id: 'slide',
      name: 'Slide',
      description: 'Slide in and push out the previous scene',
      type: 'transition',
      effect: slide,
      duration: 30,
      category: 'basic'
    },
    {
      id: 'wipe',
      name: 'Wipe',
      description: 'Slide over the previous scene',
      type: 'transition',
      effect: wipe,
      duration: 30,
      category: 'basic'
    },
    {
      id: 'flip',
      name: 'Flip',
      description: 'Rotate the previous scene',
      type: 'transition',
      effect: flip,
      duration: 30,
      category: 'basic'
    },
    {
      id: 'clockWipe',
      name: 'Clock Wipe',
      description: 'Reveal the new scene in a circular movement',
      type: 'transition',
      effect: clockWipe,
      duration: 30,
      category: 'basic'
    },
    {
      id: 'iris',
      name: 'Iris',
      description: 'Reveal the scene through a circular mask from center',
      type: 'transition',
      effect: iris,
      duration: 30,
      category: 'basic'
    },
    {
      id: 'none',
      name: 'None',
      description: 'Have no visual effect',
      type: 'transition',
      effect: none,
      duration: 0,
      category: 'basic'
    }
  ];

  return (
    <div className={`bg-gray-800 border-r border-gray-600 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-12' : 'w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        {!isCollapsed && (
          <h3 className="text-white font-medium">Media Library</h3>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <svg 
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === 'media'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === 'script'
                ? 'text-green-400 border-b-2 border-green-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            Script
          </button>
          <button
            onClick={() => setActiveTab('ai-sort')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors relative ${
              activeTab === 'ai-sort'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            AI Sort
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === 'transitions'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            Transitions
          </button>
        </div>
      )}

      {!isCollapsed && (
        <div className="h-full flex flex-col">
          {/* Media Tab Content */}
          {activeTab === 'media' && (
            <>
              <div className="p-3 flex-shrink-0">
                {/* Upload Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Upload Media</h4>
            <input
              ref={fileInputRef}
              id="video-upload-input"
              type="file"
              multiple
              accept="video/mp4,video/quicktime,.mov,.mp4,audio/*,image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div
              className={`
                p-4 border-2 border-dashed rounded transition-colors cursor-pointer
                ${uploading 
                  ? 'border-green-500 bg-green-500/10 cursor-wait' 
                  : isDragOver 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }
              `}
              onDrop={uploading ? undefined : handleDrop}
              onDragOver={uploading ? undefined : handleDragOver}
              onDragLeave={uploading ? undefined : handleDragLeave}
              onClick={uploading ? undefined : handleUploadClick}
            >
              <div className="text-center">
                {uploading ? (
                  <div className="w-8 h-8 mx-auto mb-2 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="text-sm text-gray-300">
                  {uploading 
                    ? 'Uploading videos...' 
                    : isDragOver 
                      ? 'Drop files here' 
                      : 'Drop files or click to upload (up to 20)'
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {uploading 
                    ? projectId 
                      ? 'Processing and saving to project...' 
                      : 'Processing files...'
                    : 'Videos: MP4, MOV (≤300MB converts to MP4) • Audio: MP3, WAV, M4A • Images: JPG, PNG, GIF • Max 20 files'
                  }
                </div>
                {/* Show upload progress for large files */}
                {uploading && Object.keys(uploadProgress).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(uploadProgress).map(([videoId, progress]) => (
                      <div key={videoId} className="bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {/* Video Processing Flow */}
            {projectId && (
              <VideoProcessingFlow
                ref={videoProcessingFlowRef}
                projectId={projectId}
                onVideoCompleted={handleVideoCompleted}
              />
            )}
            
            {/* Processing Status Banner */}
            {isProcessing && (
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600/50 rounded">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49z" clipRule="evenodd" />
                  </svg>
                  <span className="text-purple-300 text-sm font-medium">
                    {processingVideos.length === 1 ? 
                      `1 video processing` : 
                      `${processingVideos.length} videos processing`
                    }
                  </span>
                </div>
                {currentProcessingVideo && (
                  <div className="mt-2 text-xs text-purple-400">
                    Latest: {currentProcessingVideo.video.original_name} • {formatElapsedTime(currentProcessingVideo.elapsedSeconds)}
                  </div>
                )}
              </div>
            )}
            
            {/* Processing Error */}
            {processingError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-300 text-sm">Processing Error</span>
                </div>
                <div className="mt-1 text-xs text-red-400">{processingError}</div>
              </div>
            )}
            
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400 text-sm">Loading videos...</span>
              </div>
            )}

            {/* No Project Selected */}
            {!projectId && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">No project selected</div>
                <div className="text-gray-600 text-xs mt-1">Open a project to see its videos</div>
              </div>
            )}

                {/* Media Categories */}
                <div className="space-y-4">
                {Object.values(MediaType).map(type => {
              const itemsOfType = allMediaItems.filter(item => item.type === type);
              
              if (itemsOfType.length === 0) return null;
              
              return (
                <div key={type} className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300 capitalize flex items-center justify-between">
                    <span>{type}</span>
                    <span className="text-xs text-gray-500">({itemsOfType.length})</span>
                  </h4>
                  
                  <div className="space-y-1">
                    {itemsOfType.map(item => (
                      <div
                        key={item.id}
                        className={`group flex items-center p-2 rounded transition-colors ${
                          isConverting[item.id]
                            ? 'bg-blue-700/50 cursor-wait' 
                            : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                        }`}
                        draggable={!isConverting[item.id]}
                        onDragStart={(e) => !isConverting[item.id] && handleDragStart(e, item)}
                        onClick={() => !isConverting[item.id] && handleVideoClick(item)}
                      >
                        <div className={`flex-shrink-0 mr-3 ${getMediaColor(item.type)}`}>
                          {isConverting[item.id] ? (
                            <svg className="w-5 h-5 animate-spin text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                          ) : item.isAnalyzing ? (
                            <svg className="w-5 h-5 animate-spin text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.16-1.3-2.1-2.51-2.49A1.5 1.5 0 007.5 1.5v.75a.75.75 0 001.5 0V1.5c.83 0 1.5.67 1.5 1.5h.75a.75.75 0 000-1.5H11.49zM10 18.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H10zm-3.5-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H6.5zm7-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H13.5zm-3.5-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H10zm-3.5-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H6.5zm7-1.5a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5H13.5z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            getMediaIcon(item.type)
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">
                            {item.name}
                            {isConverting[item.id] && (
                              <span className="ml-2 text-blue-400 text-xs">
                                Converting...
                              </span>
                            )}
                            {item.isAnalyzing && (
                              <span className="ml-2 text-yellow-400 text-xs">
                                {item.processingInfo ? 
                                  `Analyzing... ${formatElapsedTime(item.processingInfo.elapsedSeconds)}` :
                                  'Analyzing by AI...'
                                }
                              </span>
                            )}
                          </div>
                          {isConverting[item.id] && conversionProgress[item.id] !== undefined ? (
                            <div className="mt-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-600 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${conversionProgress[item.id]}%` }}
                                  />
                                </div>
                                <span className="text-xs text-blue-400 min-w-12">
                                  {Math.round(conversionProgress[item.id])}%
                                </span>
                              </div>
                            </div>
                          ) : item.duration ? (
                            <div className="text-xs text-gray-400">
                              {Math.round(item.duration / state.fps * 10) / 10}s
                            </div>
                          ) : null}
                        </div>
                        
                        <div className="flex-shrink-0 flex items-center space-x-1">
                          
                          {/* Action buttons for project videos */}
                          {projectVideos.some(video => video.id === item.id) && (
                            <>
                              {/* AI Analysis button for project videos with analysis */}
                              {!item.isAnalyzing && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAnalysisPanel({
                                      isOpen: true,
                                      videoId: item.id,
                                      videoName: item.name,
                                      videoSrc: item.src,
                                    });
                                  }}
                                  className="w-4 h-4 text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="View AI analysis"
                                >
                                  <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                              
                              {/* Add to timeline button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToTimeline(item);
                                }}
                                className="w-4 h-4 text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Add to timeline"
                              >
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {/* Delete button */}
                              <button
                                onClick={(e) => handleDeleteProjectVideo(e, item.id, item.file_path || '', item.name)}
                                disabled={deleting[item.id]}
                                className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  deleting[item.id] 
                                    ? 'text-gray-400 cursor-wait' 
                                    : 'text-red-400 hover:text-red-300'
                                }`}
                                title={deleting[item.id] ? 'Deleting...' : 'Delete video from project'}
                              >
                                {deleting[item.id] ? (
                                  <svg className="animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          
                          {/* Delete button for uploaded items */}
                          {uploadedItems.some(uploaded => uploaded.id === item.id) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeUploadedItem(item.id);
                                }}
                                className="w-4 h-4 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove uploaded file"
                              >
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
                })}
                </div>
              </div>
            </>
          )}

          {/* AI Sort Tab Content */}
          {activeTab === 'ai-sort' && (
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <AIVideoSorter
                projectId={projectId || ''}
                onVideoSelect={(videoId) => {
                  // Find the video in project videos and open analysis panel
                  const video = projectVideos.find(v => v.id === videoId);
                  if (video) {
                    setAnalysisPanel({
                      isOpen: true,
                      videoId: video.id,
                      videoName: video.name,
                      videoSrc: video.src,
                    });
                  }
                }}
                onError={(error) => {
                  console.error('AI Sort Error:', error);
                  // You could add a toast notification here
                }}
                onUpgradeRequired={() => {
                  setCreditsPaywall({
                    isOpen: true,
                    requiredCredits: 0,
                    availableCredits: 0,
                    action: 'access AI video sorting',
                  });
                }}
              />
            </div>
          )}

          {/* Transitions Tab Content */}
          {activeTab === 'transitions' && (
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Available Transitions</h4>
                <p className="text-xs text-gray-500 mb-4">Drag transitions to the timeline to add them between scenes</p>
              </div>

              <div className="space-y-2">
                {availableTransitions.map(transition => (
                  <div
                    key={transition.id}
                    className="group flex items-center p-3 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                    draggable
                    onDragStart={(e) => handleTransitionDragStart(e, transition)}
                    onDragEnd={handleTransitionDragEnd}
                    onClick={() => handleAddTransitionToTimeline(transition)}
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {transition.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {transition.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {transition.description}
                      </div>
                      {transition.duration > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(transition.duration / state.fps * 10) / 10}s
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center space-x-1">
                      {transition.category === 'premium' && (
                        <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-medium">
                          Pro
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddTransitionToTimeline(transition);
                        }}
                        className="w-6 h-6 text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Add to timeline"
                      >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script Tab Content */}
          {activeTab === 'script' && (
            <div className="flex-1 flex flex-col p-3">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Project Script / Storyboard</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Add your script or storyboard content here. This will be used by AI to analyze and organize your videos.
                </p>
              </div>

              <div className="flex-1 flex flex-col">
                <textarea
                  value={scriptContent}
                  onChange={(e) => handleScriptChange(e.target.value)}
                  placeholder="Enter your script, storyboard, or video outline here...

Example:
Scene 1: Introduction
- Welcome viewers to the channel
- Brief overview of today's topic

Scene 2: Main Content
- Demonstrate the key features
- Show examples and benefits

Scene 3: Conclusion
- Summarize the main points
- Call to action for subscribers"
                  className="flex-1 w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  style={{ minHeight: '300px' }}
                />
                
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <div>
                    {scriptContent.length} characters
                  </div>
                  <div className="flex items-center space-x-2">
                    {isScriptSaving && (
                      <>
                        <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-green-400">Saving...</span>
                      </>
                    )}
                    {scriptLastSaved && !isScriptSaving && (
                      <span className="text-green-400">Saved at {scriptLastSaved}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        videoName={deleteModal.videoName}
        isDeleting={deleting[deleteModal.videoId]}
      />
      
      {/* AI Analysis Panel */}
      <AIAnalysisPanel
        videoId={analysisPanel.videoId}
        videoName={analysisPanel.videoName}
        videoSrc={analysisPanel.videoSrc}
        isOpen={analysisPanel.isOpen}
        onClose={handleCloseAnalysisPanel}
      />

      {/* Storage Paywall Modal */}
      <StoragePaywallModal
        isOpen={storagePaywall.isOpen}
        onClose={() => setStoragePaywall(prev => ({ ...prev, isOpen: false }))}
        currentStorageGB={storagePaywall.currentStorageGB}
        storageLimit={storagePaywall.storageLimit}
        fileSize={storagePaywall.fileSize}
        onSuccess={() => {
          // Close the modal
          setStoragePaywall(prev => ({ ...prev, isOpen: false }));
          
          // Re-upload the pending files after successful upgrade
          if (pendingUploadFiles.length > 0) {
            // Convert File[] to FileList-like object
            const dataTransfer = new DataTransfer();
            pendingUploadFiles.forEach(file => dataTransfer.items.add(file));
            
            // Re-trigger the file upload handler
            handleFileUpload(dataTransfer.files);
            
            // Clear pending files
            setPendingUploadFiles([]);
          }
        }}
      />

      {/* Credits Paywall Modal */}
      <PaywallModal
        isOpen={creditsPaywall.isOpen}
        onClose={() => setCreditsPaywall(prev => ({ ...prev, isOpen: false }))}
        requiredCredits={creditsPaywall.requiredCredits}
        availableCredits={creditsPaywall.availableCredits}
        action={creditsPaywall.action}
      />

      {/* Video Analysis Modal */}
      {analysisModal.file && (
        <VideoAnalysisModal
          isOpen={analysisModal.isOpen}
          onClose={handleAnalysisClose}
          onConfirm={handleAnalysisConfirm}
          fileName={analysisModal.file.name}
          fileSize={formatFileSize(analysisModal.file.size)}
          duration={`${Math.ceil(analysisModal.file.size / (1024 * 1024))} min`}
        />
      )}
    </div>
  );
}