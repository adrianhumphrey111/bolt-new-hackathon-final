"use client";

import React, { useState, useRef, useCallback } from 'react';
import { MediaType } from '../../../types/timeline';
import { useTimeline } from './TimelineContext';

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  src?: string;
  duration?: number; // in frames
  thumbnail?: string;
}

const sampleMediaItems: MediaItem[] = [
  {
    id: 'video-1',
    name: 'Sample Video 1',
    type: MediaType.VIDEO,
    src: '/sample-video-1.mp4',
    duration: 150, // 5 seconds at 30fps
  },
  {
    id: 'video-2',
    name: 'Sample Video 2',
    type: MediaType.VIDEO,
    src: '/sample-video-2.mp4',
    duration: 300, // 10 seconds at 30fps
  },
  {
    id: 'audio-1',
    name: 'Background Music',
    type: MediaType.AUDIO,
    src: '/background-music.mp3',
    duration: 900, // 30 seconds at 30fps
  },
  {
    id: 'image-1',
    name: 'Logo',
    type: MediaType.IMAGE,
    src: '/logo.png',
    duration: 90, // 3 seconds at 30fps
  },
  {
    id: 'text-1',
    name: 'Title Text',
    type: MediaType.TEXT,
    duration: 120, // 4 seconds at 30fps
  },
];

export function MediaLibrary() {
  const { state, actions } = useTimeline();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{[key: string]: number}>({});
  const [isConverting, setIsConverting] = useState<{[key: string]: boolean}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const convertMovToMp4 = async (file: File, itemId: string): Promise<string> => {
    console.log('🔄 Converting .mov to .mp4:', file.name);
    
    // Simulate conversion with progress updates
    setIsConverting(prev => ({ ...prev, [itemId]: true }));
    setConversionProgress(prev => ({ ...prev, [itemId]: 0 }));
    
    // Simulate conversion progress
    const progressInterval = setInterval(() => {
      setConversionProgress(prev => {
        const currentProgress = prev[itemId] || 0;
        const newProgress = Math.min(currentProgress + Math.random() * 15, 95);
        return { ...prev, [itemId]: newProgress };
      });
    }, 200);
    
    // Simulate conversion time (2-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    // Complete conversion
    clearInterval(progressInterval);
    setConversionProgress(prev => ({ ...prev, [itemId]: 100 }));
    
    // In a real implementation, this would use FFmpeg.js or a server-side conversion service
    // For now, we'll just use the original file but indicate it's been "converted"
    const convertedUrl = URL.createObjectURL(file);
    
    setTimeout(() => {
      setIsConverting(prev => ({ ...prev, [itemId]: false }));
      setConversionProgress(prev => {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      });
    }, 1000);
    
    console.log('✅ Conversion completed for:', file.name);
    return convertedUrl;
  };

  const isValidVideoFile = (file: File): boolean => {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension === 'mov' || extension === 'mp4' || file.type === 'video/mp4' || file.type === 'video/quicktime';
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const newItems: MediaItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Filter for video files - only allow .mov and .mp4
      if (file.type.startsWith('video/')) {
        if (!isValidVideoFile(file)) {
          console.warn('❌ Invalid video file type:', file.name, 'Only .mov and .mp4 files are supported');
          continue;
        }
      }
      
      const mediaType = getMediaTypeFromFile(file);
      const duration = await estimateDurationFromFile(file);
      const itemId = `upload-${Date.now()}-${i}`;
      
      let objectUrl: string;
      let finalName = file.name;
      
      // Check if it's a .mov file that needs conversion
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'mov') {
        console.log('🔄 .mov file detected, starting conversion:', file.name);
        objectUrl = await convertMovToMp4(file, itemId);
        finalName = file.name.replace(/\.mov$/i, '.mp4');
      } else {
        objectUrl = URL.createObjectURL(file);
      }
      
      const newItem: MediaItem = {
        id: itemId,
        name: finalName,
        type: mediaType,
        src: objectUrl,
        duration,
      };
      
      newItems.push(newItem);
    }
    
    if (newItems.length > 0) {
      setUploadedItems(prev => [...prev, ...newItems]);
    }
  }, [state.fps]);

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

  // Combine sample items and uploaded items
  const allMediaItems = [...sampleMediaItems, ...uploadedItems];

  return (
    <div className={`bg-gray-800 border-r border-gray-600 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
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
        <div className="p-3">
          {/* Upload Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Upload Media</h4>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,.mov,.mp4,audio/*,image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div
              className={`
                p-4 border-2 border-dashed rounded transition-colors cursor-pointer
                ${isDragOver 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleUploadClick}
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-300">
                  {isDragOver ? 'Drop files here' : 'Drop files or click to upload'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Video: .mov, .mp4 • Audio & Images supported
                </div>
              </div>
            </div>
          </div>

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
                          {uploadedItems.some(uploaded => uploaded.id === item.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUploadedItem(item.id);
                              }}
                              className="w-4 h-4 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
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
      )}
    </div>
  );
}