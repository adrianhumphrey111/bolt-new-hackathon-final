"use client";

import React, { useState, useRef, useCallback, useEffect, useContext, createContext } from 'react';
import { MediaType } from '../../../types/timeline';
import { useTimeline } from './TimelineContext';
import { uploadToS3, deleteFromS3 } from '../../../lib/s3Upload';
import { convertMedia } from '@remotion/webcodecs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

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
}

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
const MAX_TRANSCODE_SIZE = 1024 * 1024 * 1024; // 1GB in bytes

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectVideos, setProjectVideos] = useState<MediaItem[]>([]);
  const [uploadedItems, setUploadedItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{[key: string]: number}>({});
  const [isConverting, setIsConverting] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  // Fetch project videos from Supabase
  const fetchProjectVideos = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*, video_analysis(id)') // Select video_analysis to check for existence
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mediaItems: MediaItem[] = videos.map(video => {
        let videoUrl = video.file_path;
        
        if (video.file_path && video.file_path.startsWith('http')) {
          videoUrl = video.file_path;
        } else if (video.file_name) {
          const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET;
          if (bucketName) {
            videoUrl = `https://${bucketName}.s3.amazonaws.com/${video.file_path}`;
          } else {
            console.warn('NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET is not set. Cannot construct S3 URL.');
            videoUrl = undefined;
          }
        }
        
        // Determine if video is still analyzing based on video_analysis existence
        const isAnalyzing = !video.video_analysis || video.video_analysis.length === 0;

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
        };
      });

      setProjectVideos(mediaItems);
    } catch (error) {
      console.error('Error fetching project videos:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, state.fps]);

  // Load project videos on mount and when projectId changes
  useEffect(() => {
    fetchProjectVideos();
  }, [fetchProjectVideos]);

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

  const getMediaTypeFromFile = (file: File): MediaType => {
    const type = file.type.toLowerCase();
    if (type.startsWith('video/')) return MediaType.VIDEO;
    if (type.startsWith('audio/')) return MediaType.AUDIO;
    if (type.startsWith('image/')) return MediaType.IMAGE;
    return MediaType.TEXT; // Default fallback
  };

  const estimateDurationFromFile = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
        media.preload = 'metadata';
        
        media.onloadedmetadata = () => {
          const durationInFrames = Math.round(media.duration * state.fps);
          resolve(durationInFrames);
          URL.revokeObjectURL(media.src);
        };
        
        media.onerror = () => {
          resolve(90); // Default 3 seconds
          URL.revokeObjectURL(media.src);
        };
        
        media.src = URL.createObjectURL(file);
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
      const mp4Blob = await convertMedia({
        src: file,
        container: 'mp4',
        onProgress: ({ progress }) => {
          setConversionProgress(prev => ({ ...prev, [itemId]: progress * 100 }));
        },
      });

      const mp4File = new File([mp4Blob], file.name.replace(/\.mov$/i, '.mp4'), {
        type: 'video/mp4',
      });
      
      console.log('✅ Conversion completed for:', file.name);
      return mp4File;
    } catch (error) {
      console.error('❌ Error during MOV to MP4 conversion:', error);
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

  const saveVideoToProject = useCallback(async (file: File, duration: number): Promise<string | null> => {
    if (!projectId) {
      console.error('No project ID available for video upload');
      return null;
    }

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No user session available');
        return null;
      }

      const videoId = uuidv4(); // Generate a unique ID for the video
      const userId = session.user.id;
      const timestamp = Date.now();
      const originalName = file.name;
      const fileExtension = originalName.split('.').pop();
      const fileName = `${userId}/${projectId}/videos/${videoId}_${timestamp}_${originalName}`;
      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_BUCKET as string;
      const s3Url = `https://${bucketName}.s3.amazonaws.com/${fileName}`;

      // Save video record to database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          id: videoId, // Use the generated UUID as the video ID
          project_id: projectId,
          file_name: fileName,
          original_name: originalName,
          file_path: fileName, // Store the S3 key directly
          duration: duration / state.fps, // Convert frames to seconds
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      console.log('✅ Video saved to project:', videoData);
      
      // Now upload to S3
      await uploadToS3({ file, fileName, bucketName });
    } catch (error) {
      console.error('Error saving video to project:', error);
      return null;
    }
  }, [projectId, supabase, state.fps, fetchProjectVideos]);

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
      
      // Refresh the project videos list
      fetchProjectVideos();
      
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    } finally {
      setDeleting(prev => ({ ...prev, [videoId]: false }));
    }
  }, [supabase, fetchProjectVideos]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const newItems: MediaItem[] = [];
    
    try {
      const file = files[0];
      
      // Filter for video files - only allow .mov and .mp4
      if (file.type.startsWith('video/')) {
        if (!isValidVideoFile(file)) {
          console.warn('❌ Invalid video file type:', file.name, 'Only .mov and .mp4 files are supported');
          return; // Exit if invalid file type
        }
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
          console.log(`🔄 MOV file (${fileSize}) detected, transcoding to MP4:`, file.name);
          const transcodedFile = await convertMovToMp4(file, itemId);
          objectUrl = URL.createObjectURL(transcodedFile);
          finalName = transcodedFile.name;
          fileToUpload = transcodedFile;
        } else {
          console.log(`📁 Large MOV file (${fileSize}) detected, uploading directly without transcoding:`, file.name);
          objectUrl = URL.createObjectURL(file);
          // Keep original filename and file for upload
        }
      } else {
        objectUrl = URL.createObjectURL(file);
      }
      
      // If we have a project, save to database; otherwise, add to temporary uploaded items
      if (projectId && mediaType === MediaType.VIDEO) {
        const videoId = await saveVideoToProject(fileToUpload, duration);
        if (videoId) {
          console.log('✅ Video uploaded and saved to project');
          // No need to add to newItems, as it's handled by setProjectVideos in saveVideoToProject
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
    } catch (error) {
      console.error('Error during file upload:', error);
    } finally {
      setUploading(false);
    }
  }, [state.fps, projectId, saveVideoToProject]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

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

  // Combine project videos and uploaded items
  const allMediaItems = [...projectVideos, ...uploadedItems];

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

      {!isCollapsed && (
        <div className="h-full flex flex-col">
          <div className="p-3 flex-shrink-0">
          {/* Upload Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Upload Media</h4>
            <input
              ref={fileInputRef}
              type="file"
              
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
                      : 'Drop files or click to upload'
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {uploading 
                    ? projectId 
                      ? 'Saving to project...' 
                      : 'Processing files...'
                    : 'Video: .mov, .mp4 • Audio & Images supported'
                  }
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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
                        onClick={() => !isConverting[item.id] && handleAddToTimeline(item)}
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
                                Analyzing by AI...
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
                          {/* Delete button for uploaded items */}
                          {uploadedItems.some(uploaded => uploaded.id === item.id) && (
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
                          )}
                          
                          {/* Delete button for project videos */}
                          {projectVideos.some(video => video.id === item.id) && (
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
                          )}
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
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
    </div>
  );
}