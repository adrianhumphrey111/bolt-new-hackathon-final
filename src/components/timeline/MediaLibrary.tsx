"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaUpload, FaVideo, FaImage, FaMusic, FaTrash, FaEye, FaSpinner, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { uploadToS3, deleteFromS3 } from '@/lib/s3Upload';
import { useVideoProcessing } from '../../hooks/useVideoProcessing';
import { AIAnalysisPanel } from './AIAnalysisPanel';

// Project Context
interface ProjectContextType {
  projectId: string | null;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children, projectId }: { children: React.ReactNode; projectId: string | null }) {
  return (
    <ProjectContext.Provider value={{ projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Media item types
interface MediaItem {
  id: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  originalName: string;
  src: string;
  duration?: number;
  thumbnail?: string;
  size?: number;
  createdAt: string;
  status: string;
  s3Location?: string;
  processedFilePath?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  mediaItem?: MediaItem;
}

export function MediaLibrary() {
  const { projectId } = useProject();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const supabase = createClientComponentClient();
  
  // Use video processing hook for real-time status updates
  const { 
    isProcessing, 
    processingVideos, 
    formatElapsedTime,
    startMonitoring 
  } = useVideoProcessing(projectId);

  // Load media items for the project
  const loadMediaItems = useCallback(async () => {
    if (!projectId) {
      setMediaItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: MediaItem[] = (data || []).map(video => ({
        id: video.id,
        type: 'video' as const,
        name: video.file_name,
        originalName: video.original_name,
        src: video.s3_location || video.file_path,
        duration: video.duration,
        size: video.file_size,
        createdAt: video.created_at,
        status: video.status,
        s3Location: video.s3_location,
        processedFilePath: video.processed_file_path,
      }));

      setMediaItems(items);
    } catch (err) {
      console.error('Error loading media items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  // Load media items on mount and when project changes
  useEffect(() => {
    loadMediaItems();
  }, [loadMediaItems]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`media_library_${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'videos',
        filter: `project_id=eq.${projectId}`
      }, () => {
        loadMediaItems();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, supabase, loadMediaItems]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!projectId) {
      alert('Please select a project first');
      return;
    }

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      return isVideo || isImage || isAudio;
    });

    if (validFiles.length === 0) {
      alert('Please select valid media files (video, image, or audio)');
      return;
    }

    // Initialize upload progress tracking
    const newUploads: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Process each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const uploadIndex = uploads.length + i;

      try {
        // Update progress to show upload starting
        setUploads(prev => prev.map((upload, idx) => 
          idx === uploadIndex 
            ? { ...upload, progress: 5, status: 'uploading' }
            : upload
        ));

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;
        const filePath = `${projectId}/${fileName}`;

        // Upload to S3
        const s3Url = await uploadToS3({
          file,
          fileName: filePath,
          bucketName: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || 'your-bucket-name',
          onProgress: (progress) => {
            setUploads(prev => prev.map((upload, idx) => 
              idx === uploadIndex 
                ? { ...upload, progress: Math.min(progress * 0.8, 80) } // Reserve 20% for DB operations
                : upload
            ));
          }
        });

        // Update progress to show S3 upload complete
        setUploads(prev => prev.map((upload, idx) => 
          idx === uploadIndex 
            ? { ...upload, progress: 85, status: 'processing' }
            : upload
        ));

        // Create database record
        const { data: videoData, error: dbError } = await supabase
          .from('videos')
          .insert({
            project_id: projectId,
            file_name: fileName,
            original_name: file.name,
            file_path: filePath,
            s3_location: s3Url,
            status: 'uploaded',
            duration: null, // Will be populated by processing
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Create media item
        const mediaItem: MediaItem = {
          id: videoData.id,
          type: file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('image/') ? 'image' : 'audio',
          name: fileName,
          originalName: file.name,
          src: s3Url,
          size: file.size,
          createdAt: videoData.created_at,
          status: 'uploaded',
          s3Location: s3Url,
        };

        // Update upload progress to completed
        setUploads(prev => prev.map((upload, idx) => 
          idx === uploadIndex 
            ? { ...upload, progress: 100, status: 'completed', mediaItem }
            : upload
        ));

        // Start monitoring for video processing
        if (file.type.startsWith('video/')) {
          startMonitoring();
        }

        // Refresh media library
        loadMediaItems();

      } catch (err) {
        console.error('Upload error:', err);
        setUploads(prev => prev.map((upload, idx) => 
          idx === uploadIndex 
            ? { 
                ...upload, 
                status: 'error', 
                error: err instanceof Error ? err.message : 'Upload failed' 
              }
            : upload
        ));
      }
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploads(prev => prev.filter(upload => upload.status !== 'completed'));
    }, 3000);
  }, [projectId, supabase, uploads.length, loadMediaItems, startMonitoring]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
    // Reset input value to allow re-uploading same file
    e.target.value = '';
  }, [handleFileUpload]);

  // Handle item deletion
  const handleDeleteItem = useCallback(async (item: MediaItem) => {
    if (!confirm(`Are you sure you want to delete "${item.originalName}"?`)) {
      return;
    }

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      // Delete from S3 (optional - you might want to keep files for backup)
      if (item.s3Location) {
        try {
          const fileName = item.s3Location.split('/').pop() || '';
          await deleteFromS3(fileName, process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || 'your-bucket-name');
        } catch (s3Error) {
          console.warn('Failed to delete from S3:', s3Error);
          // Continue anyway - database deletion is more important
        }
      }

      // Refresh media library
      loadMediaItems();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete item');
    }
  }, [supabase, loadMediaItems]);

  // Handle item drag start for timeline
  const handleItemDragStart = useCallback((e: React.DragEvent, item: MediaItem) => {
    const dragData = {
      type: 'media-item',
      item: {
        type: item.type,
        name: item.originalName,
        src: item.src,
        duration: item.duration || 90, // Default 3 seconds at 30fps
        content: item.type === 'text' ? item.name : undefined,
      }
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Get media type icon
  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <FaVideo className="text-blue-400" />;
      case 'image': return <FaImage className="text-green-400" />;
      case 'audio': return <FaMusic className="text-purple-400" />;
      default: return <FaVideo className="text-gray-400" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if item is currently processing
  const isItemProcessing = (item: MediaItem) => {
    return processingVideos.some(pv => pv.video.id === item.id);
  };

  // Get processing info for item
  const getProcessingInfo = (item: MediaItem) => {
    return processingVideos.find(pv => pv.video.id === item.id);
  };

  if (!projectId) {
    return (
      <div className="w-80 bg-gray-800 border-r border-gray-600 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FaVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-600 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-600">
        <h2 className="text-lg font-semibold text-white mb-3">Media Library</h2>
        
        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
            ${dragOver 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-600 hover:border-gray-500'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <FaUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports video, image, and audio files
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="p-4 border-b border-gray-600 space-y-2">
          <h3 className="text-sm font-medium text-white">Uploading...</h3>
          {uploads.map((upload, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 truncate">{upload.file.name}</span>
                <span className="text-gray-400">{upload.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all ${
                    upload.status === 'error' ? 'bg-red-500' : 
                    upload.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.error && (
                <p className="text-xs text-red-400">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="p-4 border-b border-gray-600">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <FaSpinner className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing Videos</span>
          </div>
          {processingVideos.map((pv) => (
            <div key={pv.video.id} className="text-xs text-gray-400 mb-1">
              <div className="flex items-center justify-between">
                <span className="truncate">{pv.video.original_name}</span>
                <span>{formatElapsedTime(pv.elapsedSeconds)}</span>
              </div>
              <div className="text-blue-400">
                {pv.analysis?.status || 'Processing...'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <FaSpinner className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <FaExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error}</p>
            <button 
              onClick={loadMediaItems}
              className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
            >
              Retry
            </button>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FaVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No media files yet</p>
            <p className="text-xs mt-1">Upload some files to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {mediaItems.map((item) => {
              const processing = isItemProcessing(item);
              const processingInfo = getProcessingInfo(item);
              
              return (
                <div
                  key={item.id}
                  className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors cursor-pointer group"
                  draggable={!processing}
                  onDragStart={(e) => handleItemDragStart(e, item)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {processing ? (
                        <FaSpinner className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        getMediaIcon(item.type)
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">
                        {item.originalName}
                      </h4>
                      
                      <div className="text-xs text-gray-400 space-y-1">
                        {item.duration && (
                          <div className="flex items-center space-x-1">
                            <FaClock className="w-3 h-3" />
                            <span>{formatDuration(item.duration)}</span>
                          </div>
                        )}
                        
                        {item.size && (
                          <div>{formatFileSize(item.size)}</div>
                        )}
                        
                        {processing && processingInfo && (
                          <div className="text-blue-400">
                            Processing... {formatElapsedTime(processingInfo.elapsedSeconds)}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center space-x-1">
                        {item.type === 'video' && !processing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setShowAnalysisPanel(true);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-blue-400"
                            title="View AI Analysis"
                          >
                            <FaEye className="w-3 h-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Analysis Panel */}
      {selectedItem && (
        <AIAnalysisPanel
          videoId={selectedItem.id}
          videoName={selectedItem.originalName}
          videoSrc={selectedItem.src}
          isOpen={showAnalysisPanel}
          onClose={() => {
            setShowAnalysisPanel(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}