"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { executeAITool, getTimelineSummary, findContentHooksFromCache, CachedVideoContent, analyzeContentForRemoval } from '../../lib/timeline-ai-tools';
import { useAuthContext } from '../AuthProvider';
import { VideoClipPreview } from './VideoClipPreview';
import { RecommendedCutsPreview } from './RecommendedCutsPreview';
import { MediaType } from '../../../types/timeline';

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
}

interface RecommendedCut {
  id?: string;
  start_time?: number;  // in minutes (legacy format)
  end_time?: number;    // in minutes (legacy format)
  startTime?: number;   // in seconds (new format)
  endTime?: number;     // in seconds (new format)
  type?: 'silence' | 'filler_word' | 'specific_content' | 'unwanted_content' | 'quality_issue' | 'off_topic';
  reason: string;
  transcript?: string;
  confidence?: number;
  priority?: 'high' | 'medium' | 'low';
  videoId: string;
  videoName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  clips?: ContentClip[];
  cuts?: RecommendedCut[];
}


interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function AIChatPanel({ isOpen, onClose, projectId }: AIChatPanelProps) {
  const { state, actions } = useTimeline();
  const { session, user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🎬 Welcome to AI Content Discovery!\n\nI\'m loading your analyzed videos and will search them instantly! Try these:\n\n📹 CONTENT DISCOVERY:\n• "Show me my best hooks"\n• "Find content about [topic]"\n• "What\'s my most engaging content?"\n• "I need a good intro"\n\n✂️ SMART EDITING:\n• "What should I remove?"\n• "Show me recommended cuts"\n• "Remove filler words"\n• "Cut out silences"\n• "Add text overlay"\n\nContent search is lightning fast once loaded! ⚡',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contentCache, setContentCache] = useState<CachedVideoContent[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load content cache when chat panel opens
  const loadContentCache = async () => {
    if (!session?.access_token || !projectId || cacheLoaded) return;

    setCacheLoading(true);
    try {
      console.log('📦 Loading content cache for project:', projectId);

      // Query videos with analysis data for this project
      const response = await fetch(`/api/videos?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const videos = result.videos || [];

      console.log(`📊 Found ${videos.length} videos for project`);

      // Get video IDs for analysis query
      const videoIds = videos.map((video: any) => video.id);
      
      if (videoIds.length === 0) {
        setContentCache([]);
        setCacheLoaded(true);
        console.log('📦 No videos found for project');
        return;
      }

      // Separate query to get analysis data for all videos
      const analysisResponse = await fetch(`/api/videos/analysis-bulk?video_ids=${videoIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!analysisResponse.ok) {
        throw new Error(`Failed to fetch analysis data: ${analysisResponse.statusText}`);
      }

      const analysisResult = await analysisResponse.json();
      const analysisData = analysisResult.analyses || [];

      console.log(`📊 Found ${analysisData.length} completed analyses`);

      // Build content cache by combining video and analysis data
      const cache: CachedVideoContent[] = [];
      
      videos.forEach((video: any) => {
        // Find corresponding analysis data
        const analysis = analysisData.find((a: any) => a.video_id === video.id);
        
        if (analysis && analysis.status === 'completed' && analysis.transcription) {
          // Extract full transcript from utterances if text field is not available
          const utterances = analysis.transcription?.utterances || [];
          const fullTranscript = analysis.transcription?.text || 
                                utterances.map((u: any) => u.text).join(' ');
          
          if (fullTranscript) {
            cache.push({
              id: video.id,
              name: video.original_name,
              filePath: video.file_path,
              transcript: fullTranscript,
              utterances: utterances, // Include word-level timestamps
              llmAnalysis: analysis.llm_response,
              videoAnalysis: analysis.video_analysis,
              createdAt: video.created_at,
            });
          }
        }
      });

      console.log(`✅ ${cache.length} videos with completed analysis and transcripts`);

      setContentCache(cache);
      setCacheLoaded(true);
      console.log(`🎯 Content cache loaded with ${cache.length} analyzed videos`);

    } catch (error) {
      console.error('❌ Error loading content cache:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  // Client-side content search function using LLM analysis
  const searchCachedContent = async (query: string, topicFilter?: string): Promise<ContentClip[]> => {
    const result = await findContentHooksFromCache(contentCache, query, topicFilter);
    return result.clips || [];
  };

  // Check if query is asking about cuts/removal
  const isCutQuery = (query: string): boolean => {
    const cutKeywords = [
      'cut', 'remove', 'trim', 'delete', 'should i remove', 'what to remove', 
      'recommended cuts', 'editing suggestions', 'what should i cut',
      'silence', 'filler', 'unnecessary', 'boring parts'
    ];
    const lowerQuery = query.toLowerCase();
    return cutKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  // Get recommended cuts from cached video analysis
  const getRecommendedCuts = async (query: string): Promise<RecommendedCut[]> => {
    const cuts: RecommendedCut[] = [];
    
    // Extract recommended cuts from each video's analysis
    contentCache.forEach(video => {
      try {
        // Check if video analysis has recommended cuts (Gemini format)
        const videoAnalysis = video.videoAnalysis;
        if (videoAnalysis?.recommended_cuts_or_trims) {
          videoAnalysis.recommended_cuts_or_trims.forEach((cut: any) => {
            cuts.push({
              start_time: cut.start_time,
              end_time: cut.end_time,
              reason: cut.reason,
              priority: cut.priority || 'medium',
              videoId: video.id,
              videoName: video.name
            });
          });
        }
      } catch (error) {
        console.error('Error extracting cuts from video analysis:', error);
      }
    });

    // Filter cuts based on query if it's more specific
    if (query.toLowerCase().includes('high priority')) {
      return cuts.filter(cut => cut.priority === 'high');
    }
    if (query.toLowerCase().includes('silence')) {
      return cuts.filter(cut => cut.reason.toLowerCase().includes('silence') || cut.reason.toLowerCase().includes('pause'));
    }
    if (query.toLowerCase().includes('filler')) {
      return cuts.filter(cut => cut.reason.toLowerCase().includes('filler') || cut.reason.toLowerCase().includes('um') || cut.reason.toLowerCase().includes('uh'));
    }

    return cuts;
  };

  const handleAddToTimeline = (clip: ContentClip) => {
    // Add the video clip to the timeline
    const targetTrack = state.tracks[0] || { id: 'track-1', items: [] };
    
    // Calculate start time (end of timeline)
    const endTime = Math.max(
      ...targetTrack.items.map(item => item.startTime + item.duration),
      0
    );

    // AI now returns times in seconds (from utterances), no conversion needed
    const clipStartSeconds = clip.startTime; // Already in seconds from utterances
    const clipEndSeconds = clip.endTime; // Already in seconds from utterances  
    const clipDurationSeconds = clipEndSeconds - clipStartSeconds;
    
    // Create timeline item from clip
    const newItem = {
      type: MediaType.VIDEO,
      name: `${clip.videoName} - ${clip.name}`,
      startTime: endTime,
      duration: Math.round(clipDurationSeconds * 30), // Convert seconds to frames
      trackId: targetTrack.id,
      videoId: clip.videoId || clip.id,
      src: clip.videoUrl, // Use src for video source
      clipStart: Math.round(clipStartSeconds * 30), // Convert seconds to frames
      clipEnd: Math.round(clipEndSeconds * 30), // Convert seconds to frames
      originalName: clip.videoName,
      // Add properties for video trimming
      properties: {
        originalStartTime: clipStartSeconds, // Trim start in seconds
        originalEndTime: clipEndSeconds, // Trim end in seconds
        trim_start: clipStartSeconds,
        trim_end: clipEndSeconds
      }
    };

    // Add to timeline
    if (state.tracks.length === 0) {
      actions.addTrack();
    }
    actions.addItem(newItem);

    // Show success message
    const successMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ Added "${clip.name}" from ${clip.videoName} to your timeline!\n\nDuration: ${Math.round(clipDurationSeconds)}s\nType: ${clip.type}\nAdded at: ${Math.round(endTime / 30)}s`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, successMessage]);
  };

  const handleCutApplied = (cut: RecommendedCut) => {
    // Calculate duration based on which format is used
    const duration = cut.startTime && cut.endTime 
      ? Math.round(cut.endTime - cut.startTime) // New format in seconds
      : cut.start_time && cut.end_time 
        ? Math.round((cut.end_time - cut.start_time) * 60) // Legacy format in minutes
        : 0;
    
    // Show success message
    const successMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✂️ Applied cut to "${cut.videoName}"!\n\nRemoved: ${duration}s\nReason: ${cut.reason}\nYou can undo this change if needed.`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, successMessage]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load content cache when chat panel opens
  useEffect(() => {
    if (isOpen && !cacheLoaded && !cacheLoading) {
      loadContentCache();
    }
  }, [isOpen, projectId, session?.access_token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !session?.access_token) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if user is authenticated
      if (!session?.access_token) {
        throw new Error('Please sign in to use AI chat');
      }

      // Check if this is a cut-related query - handle it client-side
      if (isCutQuery(userMessage.content)) {
        console.log('🔍 Detected cut query, analyzing cached content');
        
        if (contentCache.length === 0) {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: cacheLoading 
              ? '📦 Content is still loading... Please wait a moment and try again.'
              : '📦 No analyzed videos found in this project. Upload and analyze videos first.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        const cuts = await getRecommendedCuts(userMessage.content);
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cuts.length > 0 
            ? `✂️ Found ${cuts.length} recommended cut${cuts.length > 1 ? 's' : ''} in your videos!\n\nI can apply these cuts to videos that are already on your timeline. If a video isn't on the timeline yet, add it first and then apply the cuts.`
            : '🔍 No recommended cuts found in your video analysis. Your content looks well-edited already!',
          timestamp: new Date(),
          cuts: cuts.length > 0 ? cuts : undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      const timelineSummary = getTimelineSummary(state);
      
      const response = await fetch(`/api/timeline/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          timelineSummary,
          timeline: {
            tracks: state.tracks,
            totalDuration: state.totalDuration,
            fps: state.fps,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.action === 'executeTool') {
        let toolResult;

        // Check if it's a content hooks request - use cached content instead of server query
        if (result.tool === 'findContentHooks') {
          console.log('🎯 Using cached content for findContentHooks');
          console.log('📝 Original user query:', userMessage.content);
          console.log('🔍 Simplified tool query:', result.args.query);
          
          if (contentCache.length === 0) {
            toolResult = {
              success: false,
              message: cacheLoading 
                ? '📦 Content is still loading... Please wait a moment and try again.'
                : '📦 No analyzed videos found in this project. Upload and analyze videos first.',
            };
          } else {
            // Use the original user message instead of the simplified query for better analysis
            const clips = await searchCachedContent(userMessage.content, result.args.topicFilter as string);
            toolResult = {
              success: true,
              message: clips.length > 0 
                ? `🎬 Found ${clips.length} content matches in your project videos!`
                : '🔍 No matches found. Try different keywords or topics.',
              action: clips.length > 0 ? {
                type: 'SHOW_CONTENT_CLIPS',
                payload: { clips }
              } : undefined
            };
          }
        } else if (result.tool === 'analyzeContentForRemoval') {
          console.log('✂️ Using cached content for analyzeContentForRemoval');
          console.log('📝 Removal query:', result.args.removalQuery);
          
          if (contentCache.length === 0) {
            toolResult = {
              success: false,
              message: cacheLoading 
                ? '📦 Content is still loading... Please wait a moment and try again.'
                : '📦 No analyzed videos found in this project. Upload and analyze videos first.',
            };
          } else {
            // Use cached content for removal analysis
            const removalResult = await analyzeContentForRemoval(
              contentCache, 
              result.args.removalQuery as string,
              result.args.videoId as string
            );
            
            toolResult = {
              success: removalResult.success,
              message: removalResult.message,
              action: removalResult.cuts && removalResult.cuts.length > 0 ? {
                type: 'SHOW_CONTENT_CUTS',
                payload: { cuts: removalResult.cuts }
              } : undefined
            };
          }
        } else {
          // Execute other tools normally
          toolResult = await executeAITool(result.tool, result.args, state, user?.id, projectId);
        }
        
        if (toolResult.success && toolResult.action) {
          // Apply the action to the timeline
          switch (toolResult.action.type) {
            case 'ADD_ITEM':
              actions.addItem(toolResult.action.payload);
              break;
            case 'ADD_TRANSITION':
              actions.addTransition(toolResult.action.payload);
              break;
            case 'UPDATE_ITEM':
              actions.updateItem(toolResult.action.payload.itemId, toolResult.action.payload.updates);
              break;
            case 'REMOVE_ITEM':
              actions.removeItem(toolResult.action.payload.itemId);
              break;
            case 'ADD_TRACK':
              actions.addTrack();
              break;
            case 'REMOVE_SILENCES':
              // Apply cuts to the video timeline
              // For now, we'll just show the message - timeline cuts would need more complex implementation
              console.log('Silence cuts detected:', toolResult.action.payload.cuts);
              break;
            case 'SHOW_CONTENT_CLIPS':
              // Handle content clips display - will be shown in message
              break;
            case 'SHOW_CONTENT_CUTS':
              // Handle content cuts display - will be shown in message
              break;
          }
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: toolResult.message,
          timestamp: new Date(),
          clips: toolResult.action?.type === 'SHOW_CONTENT_CLIPS' ? toolResult.action.payload.clips : undefined,
          cuts: toolResult.action?.type === 'SHOW_CONTENT_CUTS' ? toolResult.action.payload.cuts : undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else if (result.action === 'textResponse') {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-800 shadow-xl border-l border-gray-600 z-50 transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } ${messages.some(msg => (msg.clips && msg.clips.length > 0) || (msg.cuts && msg.cuts.length > 0)) ? 'w-[600px]' : 'w-[400px]'} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-600 bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-white">AI Content Discovery</h2>
          {/* Cache Status Indicator */}
          {cacheLoading && (
            <div className="flex items-center space-x-1 text-xs text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Loading content...</span>
            </div>
          )}
          {cacheLoaded && (
            <div className="flex items-center space-x-1 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{contentCache.length} videos ready</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`${(message.clips && message.clips.length > 0) || (message.cuts && message.cuts.length > 0) ? 'max-w-full' : 'max-w-xs'} px-3 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              {message.clips && <VideoClipPreview clips={message.clips} onAddToTimeline={handleAddToTimeline} />}
              {message.cuts && <RecommendedCutsPreview cuts={message.cuts} onCutApplied={handleCutApplied} />}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-gray-400">Searching...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-600 bg-gray-900">
        <form onSubmit={handleSubmit} className="p-4">
          {!session?.access_token ? (
            <div className="text-center py-3">
              <p className="text-gray-400 text-sm mb-1">Sign in to use AI chat</p>
              <div className="text-xs text-gray-500">Authentication required</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2 items-end">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Find my best hooks..."
                  className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none text-sm resize-none min-h-[40px] max-h-32 overflow-y-auto"
                  disabled={isLoading}
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: '40px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {/* Timeline Summary */}
              <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                {getTimelineSummary(state)}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}