"use client";

import React, { useRef, useState } from 'react';

interface ContentClip {
  id: string;
  name: string;
  type: 'hook' | 'intro' | 'main_point' | 'conclusion' | 'transition' | 'highlight';
  startTime: number;
  endTime: number;
  confidence: number;
  reason: string;
  transcript: string;
  videoUrl?: string;
  videoName?: string;
  videoId?: string;
}

interface VideoClipPreviewProps {
  clips: ContentClip[];
  onAddToTimeline?: (clip: ContentClip) => void;
}

const typeColors = {
  hook: 'bg-red-600',
  intro: 'bg-blue-600',
  main_point: 'bg-green-600',
  conclusion: 'bg-purple-600',
  transition: 'bg-yellow-600',
  highlight: 'bg-pink-600',
};

const typeIcons = {
  hook: '🎣',
  intro: '🎬',
  main_point: '💡',
  conclusion: '🎯',
  transition: '🔄',
  highlight: '⭐',
};

export function VideoClipPreview({ clips, onAddToTimeline }: VideoClipPreviewProps) {
  const [selectedClip, setSelectedClip] = useState<ContentClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playClip = (clip: ContentClip) => {
    setSelectedClip(clip);
    if (videoRef.current && clip.videoUrl) {
      videoRef.current.currentTime = clip.startTime;
      videoRef.current.play();
      setIsPlaying(true);
      
      // Set up a timeout to pause at the end time
      const duration = clip.endTime - clip.startTime;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }, duration * 1000);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && selectedClip) {
      if (videoRef.current.currentTime >= selectedClip.endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  if (!clips || clips.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-gray-400 mb-2">
        🎬 Found {clips.length} compelling moment{clips.length > 1 ? 's' : ''}:
      </div>
      
      {clips.map((clip, index) => (
        <div
          key={clip.id}
          className="bg-gray-800 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{typeIcons[clip.type]}</span>
              <div>
                <div className="text-sm font-medium text-white">{clip.name}</div>
                <div className={`inline-block px-2 py-1 rounded text-xs text-white ${typeColors[clip.type]}`}>
                  {clip.type.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</div>
              <div className="text-green-400">
                {Math.round(clip.confidence * 100)}% confidence
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-300 mb-2">
            <span className="font-medium">Why it's great:</span> {clip.reason}
          </div>
          
          <div className="bg-gray-900 rounded p-2 mb-3">
            <div className="text-xs text-gray-400 mb-1">Transcript:</div>
            <div className="text-sm text-gray-200 italic">"{clip.transcript}"</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => playClip(clip)}
                disabled={!clip.videoUrl}
                className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${
                  clip.videoUrl
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Preview</span>
              </button>
              
              {onAddToTimeline && (
                <button
                  onClick={() => onAddToTimeline(clip)}
                  className="flex items-center space-x-2 px-3 py-2 rounded text-sm bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Add to Timeline</span>
                </button>
              )}
            </div>
            
            <div className="text-xs text-gray-400">
              Duration: {Math.round(clip.endTime - clip.startTime)}s
            </div>
          </div>
        </div>
      ))}
      
      {/* Video Player */}
      {selectedClip && selectedClip.videoUrl && (
        <div className="mt-4 bg-gray-900 rounded-lg p-3">
          <div className="text-sm text-gray-300 mb-2 flex items-center justify-between">
            <span>🎥 Previewing: {selectedClip.name}</span>
            <button
              onClick={() => setSelectedClip(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <video
            ref={videoRef}
            src={selectedClip.videoUrl}
            controls
            className="w-full rounded"
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ maxHeight: '200px' }}
          >
            Your browser does not support the video tag.
          </video>
          <div className="text-xs text-gray-400 mt-2">
            Playing from {formatTime(selectedClip.startTime)} to {formatTime(selectedClip.endTime)}
          </div>
        </div>
      )}
    </div>
  );
}