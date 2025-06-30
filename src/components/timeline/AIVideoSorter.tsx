"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClientSupabaseClient } from '../../lib/supabase/client';

interface SortOption {
  id: string;
  name: string;
  description: string;
  sortKey: string;
  dataType: 'string' | 'number' | 'date' | 'array';
}

interface AIVideoData {
  videoId: string;
  videoName: string;
  duration: number;
  quality: {
    overall: string;
    visual: string;
    audio: string;
  };
  content: {
    type: string;
    mood: string;
    topics: string[];
    complexity: string;
  };
  technical: {
    editingViability: number;
    scriptAlignment: number;
    speechQuality: string;
  };
  metadata: {
    uploadDate: string;
    processingDate: string;
  };
}

interface SearchResult {
  videoId: string;
  videoName: string;
  relevanceScore: number;
  matchingSegments: {
    type: 'transcript' | 'analysis' | 'metadata';
    content: string;
    timestamp?: number;
    confidence: number;
  }[];
  summary: string;
  thumbnailUrl?: string;
  duration: number;
}

interface AIVideoSorterProps {
  projectId: string;
  onVideoSelect: (videoId: string) => void;
  onError: (error: string) => void;
  onUpgradeRequired: () => void;
}

export function AIVideoSorter({ 
  projectId, 
  onVideoSelect, 
  onError, 
  onUpgradeRequired 
}: AIVideoSorterProps) {
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [videoData, setVideoData] = useState<AIVideoData[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<AIVideoData[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'sort' | 'search'>('sort');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const supabase = createClientSupabaseClient();

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 Client session:', session ? 'found' : 'not found', error ? `Error: ${error.message}` : '');
    if (session?.access_token) {
      console.log('🔍 Access token length:', session.access_token.length);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [supabase]);

  // Initialize AI sorting data
  const initializeAISorting = useCallback(async () => {
    if (!projectId || isInitialized || upgradeRequired) return;
    
    setLoading(true);
    setError('');
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/videos/ai-sort?project_id=${projectId}`, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.upgrade_required) {
          setUpgradeRequired(true);
          onUpgradeRequired();
          return;
        }
        throw new Error(errorData.error || 'Failed to load AI sorting data');
      }

      const data = await response.json();
      
      if (data.success) {
        setSortOptions(data.sortOptions || []);
        setVideoData(data.videoData || []);
        setFilteredVideos(data.videoData || []);
        setIsInitialized(true);
      } else {
        throw new Error(data.message || 'Failed to load AI sorting data');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId, isInitialized, upgradeRequired, getAuthHeaders, onUpgradeRequired, onError]);

  // Perform AI search
  const performAISearch = useCallback(async () => {
    if (!searchQuery.trim() || !projectId || upgradeRequired) return;
    
    setSearching(true);
    setError('');
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/videos/ai-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          query: searchQuery,
          searchType: 'semantic'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.upgrade_required) {
          setUpgradeRequired(true);
          onUpgradeRequired();
          return;
        }
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results || []);
        setSearchMode('search');
      } else {
        throw new Error(data.message || 'Search failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, projectId, upgradeRequired, getAuthHeaders, onUpgradeRequired, onError]);

  // Apply sorting
  const applySorting = useCallback(async () => {
    if (!selectedSort || !projectId || upgradeRequired) {
      setFilteredVideos(videoData);
      return;
    }
    
    setLoading(true);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/videos/ai-sort', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          sortBy: selectedSort,
          sortOrder,
          searchQuery: ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.upgrade_required) {
          setUpgradeRequired(true);
          onUpgradeRequired();
          return;
        }
        throw new Error('Failed to apply sorting');
      }

      const data = await response.json();
      
      if (data.success) {
        setFilteredVideos(data.videos || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sorting failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedSort, sortOrder, projectId, videoData, upgradeRequired, getAuthHeaders, onUpgradeRequired, onError]);

  // Initialize on mount
  useEffect(() => {
    initializeAISorting();
  }, [initializeAISorting]);

  // Apply sorting when sort options change
  useEffect(() => {
    applySorting();
  }, [selectedSort, sortOrder]);

  // Handle search input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performAISearch();
    }
  };

  // Clear search and return to sort mode
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMode('sort');
  };

  // Render quality indicator
  const renderQualityIndicator = (quality: string) => {
    const colorMap = {
      'excellent': 'text-green-400',
      'high': 'text-green-400',
      'good': 'text-blue-400',
      'medium': 'text-yellow-400',
      'low': 'text-orange-400',
      'poor': 'text-red-400',
      'unknown': 'text-gray-400'
    };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 ${colorMap[quality as keyof typeof colorMap] || 'text-gray-400'}`}>
        {quality}
      </span>
    );
  };

  // Render video card
  const renderVideoCard = (video: AIVideoData | SearchResult, isSearchResult = false) => {
    const videoId = video.videoId;
    const videoName = video.videoName;
    const duration = video.duration;
    
    return (
      <div
        key={videoId}
        className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 cursor-pointer transition-colors"
        onClick={() => onVideoSelect(videoId)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-white text-sm font-medium truncate flex-1 mr-2">
            {videoName}
          </h4>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {Math.round(duration)}s
          </span>
        </div>
        
        {isSearchResult ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-400">
                Relevance: {Math.round((video as SearchResult).relevanceScore * 100)}%
              </span>
            </div>
            
            <div className="text-xs text-gray-400">
              {(video as SearchResult).summary}
            </div>
            
            <div className="space-y-1">
              {(video as SearchResult).matchingSegments.slice(0, 2).map((segment, idx) => (
                <div key={idx} className="text-xs text-gray-300 bg-gray-800 p-2 rounded">
                  <span className="text-blue-400 capitalize">{segment.type}:</span> {segment.content}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 capitalize">
                {(video as AIVideoData).content.type}
              </span>
              {renderQualityIndicator((video as AIVideoData).quality.overall)}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {(video as AIVideoData).content.topics.slice(0, 3).map((topic, idx) => (
                <span key={idx} className="text-xs bg-blue-500 bg-opacity-20 text-blue-300 px-2 py-1 rounded">
                  {topic}
                </span>
              ))}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>Edit: {(video as AIVideoData).technical.editingViability}/10</span>
              <span>Script: {(video as AIVideoData).technical.scriptAlignment}/10</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (upgradeRequired) {
    return (
      <div className="p-4 bg-purple-900/30 border border-purple-600/50 rounded">
        <div className="text-purple-300 text-sm font-medium">Pro Subscription Required</div>
        <div className="text-purple-200 text-xs mt-1">
          AI video sorting and semantic search require a Pro subscription.
        </div>
        <button 
          onClick={onUpgradeRequired}
          className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-400 text-sm">Initializing AI sorting...</span>
      </div>
    );
  }

  if (error && !isInitialized) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-600/50 rounded">
        <div className="text-red-300 text-sm">{error}</div>
        <button 
          onClick={initializeAISorting}
          className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 3a1 1 0 012 0v5.5a.5.5 0 001 0V4a1 1 0 112 0v4.5a.5.5 0 001 0V6a1 1 0 112 0v6a2 2 0 11-4 0V9a1 1 0 10-2 0v3a2 2 0 11-4 0V3z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-white">AI Video Intelligence</h4>
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
            PRO
          </div>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos by content, topics, or transcript..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 animate-spin text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || searching}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        {searchMode === 'search' && (
          <button
            onClick={clearSearch}
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            ← Back to sorting
          </button>
        )}
      </div>

      {/* AI Sorting Controls */}
      {searchMode === 'sort' && sortOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">Sort by...</option>
              {sortOptions.map(option => (
                <option key={option.id} value={option.sortKey}>
                  {option.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-gray-700 hover:bg-gray-600 border border-gray-600 px-3 py-2 rounded text-white text-sm transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {selectedSort && (
            <div className="text-xs text-gray-400">
              {sortOptions.find(opt => opt.sortKey === selectedSort)?.description}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-400 text-sm">Processing...</span>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-600/50 rounded">
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        )}
        
        {searchMode === 'search' && searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              Found {searchResults.length} relevant videos
            </div>
            {searchResults.map(video => renderVideoCard(video, true))}
          </div>
        )}
        
        {searchMode === 'sort' && filteredVideos.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              {filteredVideos.length} videos {selectedSort ? `sorted by ${sortOptions.find(opt => opt.sortKey === selectedSort)?.name}` : ''}
            </div>
            {filteredVideos.map(video => renderVideoCard(video, false))}
          </div>
        )}
        
        {((searchMode === 'search' && searchResults.length === 0 && searchQuery) || 
          (searchMode === 'sort' && filteredVideos.length === 0)) && !loading && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-sm">No videos found</div>
            <div className="text-xs mt-1">
              {searchMode === 'search' 
                ? 'Try a different search term or check if your videos have been analyzed'
                : 'No analyzed videos available for sorting'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}