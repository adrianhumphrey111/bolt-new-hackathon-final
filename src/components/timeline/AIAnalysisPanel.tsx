"use client";

import React, { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '../../lib/supabase/client';
import { OneShotGenerateModal } from './OneShotGenerateModal';

interface SceneAnalysis {
  timeRange: {
    start: number;
    end: number;
  } | string;
  contentType: string;
  correlation: string;
  editingNotes: string;
  significance: string;
  speechQuality: string;
  visualQuality: string;
  scriptAlignment: {
    matchType: string;
    confidence: number;
    alternativeUses: string[];
    semanticOverlap: number;
    keyPhraseMatches: string[];
    targetScriptSection: string;
  };
  audioDescription: string;
  visualDescription: string;
  scriptOptimization: {
    narrativeRole: string;
    scriptReadiness: string;
    editingComplexity: string;
    bestScriptApplication: string;
  };
}

interface OverallMetrics {
  clipQuality: string;
  scriptUsability: string;
  editingViability: number;
  scriptAlignmentScore: number;
  recommendedScriptRole: string;
}

interface AIAnalysisData {
  sceneAnalysis: SceneAnalysis[];
  overallMetrics: OverallMetrics;
}

// New V2 Gemini video analysis interfaces
interface V2Chunk {
  start_time: number;
  end_time: number;
  visual_description: string;
  scene_type: string;
  content_type: string;
  engagement_score: number;
  hook_potential: number;
  platform_optimization: {
    tiktok_score: number;
    youtube_score: number;
    instagram_score: number;
    best_platform: string;
  };
  visual_quality: number;
  audio_quality: number;
  cut_points: {
    natural_cuts: Array<{
      frame: number;
      ms: number;
      confidence: number;
      reason: string;
    }>;
    power_moments: Array<{
      frame: number;
      ms: number;
      engagement_score: number;
      description: string;
    }>;
    avoid_zones: Array<{
      start_frame: number;
      end_frame: number;
      reason: string;
      severity: string;
    }>;
  };
}

interface V2ContentIntelligence {
  best_moments: Array<{
    start_ms: number;
    end_ms: number;
    hook_score: number;
    description: string;
  }>;
  platform_optimization: {
    tiktok: {
      hook_strength: number;
      energy_level: string;
    };
    youtube: {
      retention_curve: number;
      educational_value: number;
    };
  };
}

interface V2AnalysisData {
  chunks: V2Chunk[];
  duration: number;
  content_intelligence: V2ContentIntelligence;
  overall_pacing_assessment?: string;
  recommended_cuts_or_trims?: Array<{
    start_time: number;
    end_time: number;
    reason: string;
    priority: string;
  }>;
  highlight_moments_worth_emphasizing?: Array<{
    start_time: number;
    end_time: number;
    description: string;
    emphasis_type: string;
    suggested_enhancement: string;
  }>;
}

// Legacy Gemini analysis for backward compatibility
interface GeminiChunk {
  start_time: number;
  end_time: number;
  visual_description: string;
  scene_type: string;
  key_elements: string[];
  editing_suggestions: string;
}

interface GeminiCutTrim {
  start_time: number;
  end_time: number;
  reason: string;
  priority: string;
}

interface GeminiHighlight {
  start_time: number;
  end_time: number;
  description: string;
  emphasis_type: string;
  suggested_enhancement: string;
}

interface GeminiAnalysisData {
  duration: number; // duration in seconds
  chunks: GeminiChunk[];
  overall_pacing_assessment: string;
  recommended_cuts_or_trims: GeminiCutTrim[];
  highlight_moments_worth_emphasizing: GeminiHighlight[];
}

interface TranscriptData {
  data: any;
  status: string;
  created_at: string | null;
  has_transcript: boolean;
}

interface AIAnalysisPanelProps {
  videoId: string;
  videoName: string;
  videoSrc?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIAnalysisPanel({ videoId, videoName, videoSrc, isOpen, onClose }: AIAnalysisPanelProps) {
  const [analysisData, setAnalysisData] = useState<AIAnalysisData | null>(null);
  const [geminiAnalysisData, setGeminiAnalysisData] = useState<GeminiAnalysisData | null>(null);
  const [v2AnalysisData, setV2AnalysisData] = useState<V2AnalysisData | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [activeTab, setActiveTab] = useState<'v2' | 'claude' | 'gemini' | 'transcript'>('v2'); // Default to V2 tab
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [selectedGeminiChunk, setSelectedGeminiChunk] = useState<number | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [showReanalysisModal, setShowReanalysisModal] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisStatus, setReanalysisStatus] = useState<'idle' | 'processing' | 'polling' | 'completed' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [showOneShotModal, setShowOneShotModal] = useState(false);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    if (isOpen && videoId) {
      fetchAnalysisData();
    }
  }, [isOpen, videoId]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/videos/${videoId}/analysis`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis data: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle transcript data
      if (data.transcript) {
        console.log('Transcript data received:', data.transcript);
        setTranscriptData(data.transcript);
      }

      if (data.has_analysis) {
        // Check for V2 analysis data (new enhanced structure)
        if (data.video_analysis && data.video_analysis.chunks && data.video_analysis.chunks.length > 0) {
          const firstChunk = data.video_analysis.chunks[0];
          if (firstChunk.platform_optimization || firstChunk.engagement_score !== undefined) {
            // This is V2 format
            setV2AnalysisData(data.video_analysis);
            setActiveTab('v2');
          } else {
            // This is legacy Gemini format
            setGeminiAnalysisData(data.video_analysis);
            setActiveTab('gemini');
          }
          if (data.video_analysis.chunks.length > 0) {
            setSelectedGeminiChunk(0);
          }
        }
        // Check for Claude analysis data (legacy format)
        else if (data.analysis_data && data.analysis_data.sceneAnalysis) {
          setAnalysisData(data.analysis_data);
          if (data.analysis_data.sceneAnalysis.length > 0) {
            setSelectedScene(0);
          }
          setActiveTab('claude');
        }
        // Check for legacy Gemini in analysis_data
        else if (data.analysis_data && data.analysis_data.chunks) {
          setGeminiAnalysisData(data.analysis_data);
          if (data.analysis_data.chunks.length > 0) {
            setSelectedGeminiChunk(0);
          }
          setActiveTab('gemini');
        } else {
          setError('No analysis data available for this video');
        }
      } else {
        // No analysis but might have transcript
        if (data.transcript && data.transcript.has_transcript) {
          setActiveTab('transcript');
        } else {
          setError('No analysis data available for this video');
        }
      }
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRange = (timeRange: any): string => {
    if (typeof timeRange === 'string') {
      return timeRange;
    }
    if (timeRange?.start !== undefined && timeRange?.end !== undefined) {
      return `${timeRange.start.toFixed(1)}s - ${timeRange.end.toFixed(1)}s`;
    }
    return 'Unknown time range';
  };

  const getQualityColor = (quality: string) => {
    switch (quality.toLowerCase()) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const parseTimeRange = (timeRange: any): { start: number; end: number } => {
    if (typeof timeRange === 'string') {
      const match = timeRange.match(/(\d+\.?\d*)s?\s*-\s*(\d+\.?\d*)s?/);
      if (match) {
        return { start: parseFloat(match[1]), end: parseFloat(match[2]) };
      }
    }
    if (timeRange?.start !== undefined && timeRange?.end !== undefined) {
      return { start: timeRange.start, end: timeRange.end };
    }
    return { start: 0, end: 0 };
  };

  const playScene = (sceneIndex: number) => {
    if (!videoElement || !analysisData) return;
    
    const scene = analysisData.sceneAnalysis[sceneIndex];
    const timeRange = parseTimeRange(scene.timeRange);
    
    videoElement.currentTime = timeRange.start;
    videoElement.play();
    
    // Stop at end time
    const handleTimeUpdate = () => {
      if (videoElement.currentTime >= timeRange.end) {
        videoElement.pause();
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
    
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
  };

  const playGeminiChunk = (chunkIndex: number) => {
    if (!videoElement || !geminiAnalysisData) return;
    
    const chunk = geminiAnalysisData.chunks[chunkIndex];
    
    // Convert minutes to seconds
    const startTimeSeconds = chunk.start_time * 60;
    const endTimeSeconds = chunk.end_time * 60;
    
    videoElement.currentTime = startTimeSeconds;
    videoElement.play();
    
    // Stop at end time
    const handleTimeUpdate = () => {
      if (videoElement.currentTime >= endTimeSeconds) {
        videoElement.pause();
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
    
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
  };

  // Format time from minutes to display format
  const formatMinutesToTime = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedScene !== null && videoElement && analysisData && activeTab === 'claude') {
      playScene(selectedScene);
    }
  }, [selectedScene, videoElement, analysisData, activeTab]);

  useEffect(() => {
    if (selectedGeminiChunk !== null && videoElement && geminiAnalysisData && activeTab === 'gemini') {
      playGeminiChunk(selectedGeminiChunk);
    }
  }, [selectedGeminiChunk, videoElement, geminiAnalysisData, activeTab]);

  // Polling mechanism for re-analysis status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (reanalysisStatus === 'polling') {
      pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('video_analysis')
            .select('status, llm_response')
            .eq('video_id', videoId)
            .single();

          if (error) throw error;

          if (data?.status === 'completed' && data?.llm_response) {
            setAnalysisData(data.llm_response);
            setReanalysisStatus('completed');
            setIsReanalyzing(false);
            setPollCount(0);
            // Auto-select first scene if available
            if (data.llm_response.sceneAnalysis && data.llm_response.sceneAnalysis.length > 0) {
              setSelectedScene(0);
            }
          } else if (data?.status === 'failed') {
            setReanalysisStatus('error');
            setIsReanalyzing(false);
            setError('Re-analysis failed. Please try again.');
            setPollCount(0);
          } else {
            // Still processing, increment poll count
            setPollCount(prev => prev + 1);
            
            // Stop polling after 2 minutes (24 polls at 5s intervals)
            if (pollCount >= 24) {
              setReanalysisStatus('error');
              setIsReanalyzing(false);
              setError('Re-analysis took too long. Please check back later.');
              setPollCount(0);
            }
          }
        } catch (err) {
          console.error('Error polling analysis status:', err);
          setReanalysisStatus('error');
          setIsReanalyzing(false);
          setError('Failed to check analysis status');
          setPollCount(0);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [reanalysisStatus, pollCount, videoId, supabase]);

  const handleReanalysis = async () => {
    if (!videoId) return;

    setIsReanalyzing(true);
    setReanalysisStatus('processing');
    setError(null);
    setPollCount(0);

    try {
      const response = await fetch(`/api/videos/${videoId}/reanalyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additional_context: additionalContext.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start re-analysis');
      }

      // Start polling for results
      setReanalysisStatus('polling');
      setShowReanalysisModal(false);
      setAdditionalContext('');
    } catch (err) {
      console.error('Error starting re-analysis:', err);
      setReanalysisStatus('error');
      setIsReanalyzing(false);
      setError(err instanceof Error ? err.message : 'Failed to start re-analysis');
    }
  };

  const resetReanalysisState = () => {
    setShowReanalysisModal(false);
    setAdditionalContext('');
    setIsReanalyzing(false);
    setReanalysisStatus('idle');
    setPollCount(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <div className="bg-gray-800 shadow-xl w-full h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-600">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">AI Analysis</h2>
              <p className="text-gray-400 text-sm truncate max-w-md">{videoName}</p>
              {reanalysisStatus === 'polling' && (
                <div className="flex items-center mt-2 text-sm text-blue-400">
                  <svg className="w-4 h-4 animate-spin mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Re-analyzing with AI... ({pollCount * 5}s)
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* One Shot Generate Button */}
              {geminiAnalysisData && activeTab === 'gemini' && (geminiAnalysisData.recommended_cuts_or_trims?.length > 0 || geminiAnalysisData.highlight_moments_worth_emphasizing?.length > 0) && (
                <button
                  onClick={() => setShowOneShotModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span>One Shot Generate</span>
                </button>
              )}
              
              {/* Re-analysis Button - Show always when not already re-analyzing */}
              {!isReanalyzing && (
                <button
                  onClick={() => setShowReanalysisModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <span>{analysisData || geminiAnalysisData ? 'Re-analyze' : 'Analyze'}</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  resetReanalysisState();
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-600">
            {v2AnalysisData && (
              <button
                onClick={() => setActiveTab('v2')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'v2'
                    ? 'text-green-400 border-b-2 border-green-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                🚀 V2 Analysis
              </button>
            )}
            {geminiAnalysisData && (
              <button
                onClick={() => setActiveTab('gemini')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'gemini'
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                🎥 Video Analysis
              </button>
            )}
            {analysisData && (
              <button
                onClick={() => setActiveTab('claude')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'claude'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                📝 Script Analysis
              </button>
            )}
            {(transcriptData?.has_transcript || transcriptData?.data) && (
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'transcript'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                📄 Transcript
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-400">Loading analysis...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={fetchAnalysisData}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (analysisData || geminiAnalysisData || v2AnalysisData || transcriptData?.has_transcript) ? (
            activeTab === 'v2' && v2AnalysisData ? (
              <div className="h-full overflow-y-auto">
                {/* V2 Enhanced Analysis Layout */}
                <div className="max-w-7xl mx-auto p-8 space-y-8">
                  {/* Header Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Duration</h3>
                      <div className="text-2xl font-bold text-white">
                        {Math.floor(v2AnalysisData.duration / 60)}:{(v2AnalysisData.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-400 mb-2">Total Chunks</h3>
                      <div className="text-2xl font-bold text-white">
                        {v2AnalysisData.chunks.length}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 border border-blue-500/30">
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Best Platform</h3>
                      <div className="text-2xl font-bold text-white capitalize">
                        {v2AnalysisData.chunks[0]?.platform_optimization?.best_platform || 'Unknown'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2">Avg Engagement</h3>
                      <div className="text-2xl font-bold text-white">
                        {Math.round((v2AnalysisData.chunks.reduce((sum, chunk) => sum + (chunk.engagement_score || 0), 0) / v2AnalysisData.chunks.length) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Video Player */}
                  {videoSrc && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Video Player</h3>
                      <div className="flex flex-col lg:flex-row gap-6">
                        <video
                          ref={setVideoElement}
                          src={videoSrc}
                          controls
                          className="flex-1 rounded-lg shadow-lg max-h-96"
                        />
                        {selectedGeminiChunk !== null && v2AnalysisData.chunks[selectedGeminiChunk] && (
                          <div className="lg:w-80 space-y-4">
                            <div className="bg-gray-700 rounded-lg p-4">
                              <h4 className="font-semibold text-white mb-2">Selected Chunk</h4>
                              <div className="text-sm text-gray-300 space-y-1">
                                <p><span className="text-gray-400">Time:</span> {v2AnalysisData.chunks[selectedGeminiChunk].start_time}s - {v2AnalysisData.chunks[selectedGeminiChunk].end_time}s</p>
                                <p><span className="text-gray-400">Type:</span> {v2AnalysisData.chunks[selectedGeminiChunk].scene_type}</p>
                                <p><span className="text-gray-400">Engagement:</span> {Math.round((v2AnalysisData.chunks[selectedGeminiChunk].engagement_score || 0) * 100)}%</p>
                                <p><span className="text-gray-400">Hook Potential:</span> {Math.round((v2AnalysisData.chunks[selectedGeminiChunk].hook_potential || 0) * 100)}%</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (videoElement) {
                                    videoElement.currentTime = v2AnalysisData.chunks[selectedGeminiChunk].start_time;
                                    videoElement.play();
                                  }
                                }}
                                className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                ▶ Play Chunk
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Platform Intelligence */}
                  {v2AnalysisData.content_intelligence && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-6">Platform Intelligence</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {v2AnalysisData.content_intelligence.platform_optimization.tiktok && (
                          <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-lg p-4 border border-pink-500/30">
                            <h4 className="text-lg font-semibold text-pink-400 mb-3">TikTok Optimization</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-300">Hook Strength:</span>
                                <span className="text-white font-medium">{Math.round((v2AnalysisData.content_intelligence.platform_optimization.tiktok.hook_strength || 0) * 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">Energy Level:</span>
                                <span className="text-white font-medium capitalize">{v2AnalysisData.content_intelligence.platform_optimization.tiktok.energy_level}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {v2AnalysisData.content_intelligence.platform_optimization.youtube && (
                          <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg p-4 border border-red-500/30">
                            <h4 className="text-lg font-semibold text-red-400 mb-3">YouTube Optimization</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-300">Retention Curve:</span>
                                <span className="text-white font-medium">{Math.round((v2AnalysisData.content_intelligence.platform_optimization.youtube.retention_curve || 0) * 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">Educational Value:</span>
                                <span className="text-white font-medium">{Math.round((v2AnalysisData.content_intelligence.platform_optimization.youtube.educational_value || 0) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Best Moments */}
                  {v2AnalysisData.content_intelligence?.best_moments && v2AnalysisData.content_intelligence.best_moments.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-6">🔥 Best Moments</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {v2AnalysisData.content_intelligence.best_moments.map((moment, index) => (
                          <div key={index} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-400/50 transition-colors cursor-pointer"
                               onClick={() => {
                                 if (videoElement) {
                                   videoElement.currentTime = moment.start_ms / 1000;
                                   videoElement.play();
                                 }
                               }}>
                            <div className="flex justify-between items-start mb-3">
                              <div className="text-lg font-semibold text-yellow-400">
                                {Math.floor(moment.start_ms / 1000 / 60)}:{((moment.start_ms / 1000) % 60).toFixed(0).padStart(2, '0')} - {Math.floor(moment.end_ms / 1000 / 60)}:{((moment.end_ms / 1000) % 60).toFixed(0).padStart(2, '0')}
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-yellow-300 font-medium">Hook Score</div>
                                <div className="text-lg font-bold text-white">{Math.round(moment.hook_score * 100)}%</div>
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {moment.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chunks Grid */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Video Chunks ({v2AnalysisData.chunks.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {v2AnalysisData.chunks.map((chunk, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedGeminiChunk(index)}
                          className={`text-left p-4 rounded-lg transition-all hover:scale-[1.02] ${
                            selectedGeminiChunk === index 
                              ? 'bg-green-600 text-white shadow-lg shadow-green-600/25' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-semibold">
                              {chunk.start_time}s - {chunk.end_time}s
                            </div>
                            <div className="text-xs bg-gray-600 px-2 py-1 rounded">
                              {Math.round((chunk.engagement_score || 0) * 100)}%
                            </div>
                          </div>
                          <div className="text-xs opacity-75 capitalize mb-2">
                            {chunk.scene_type} • {chunk.content_type}
                          </div>
                          <div className="text-xs opacity-60 line-clamp-2 mb-2">
                            {chunk.visual_description}
                          </div>
                          {chunk.platform_optimization && (
                            <div className="flex justify-between text-xs">
                              <span className="text-pink-300">TT: {Math.round(chunk.platform_optimization.tiktok_score * 100)}%</span>
                              <span className="text-red-300">YT: {Math.round(chunk.platform_optimization.youtube_score * 100)}%</span>
                              <span className="text-purple-300">IG: {Math.round(chunk.platform_optimization.instagram_score * 100)}%</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Chunk Details */}
                  {selectedGeminiChunk !== null && v2AnalysisData.chunks[selectedGeminiChunk] && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-6">
                        Chunk {selectedGeminiChunk + 1} - Detailed Analysis
                      </h3>
                      {(() => {
                        const chunk = v2AnalysisData.chunks[selectedGeminiChunk];
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Content Analysis</h4>
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                                  <div>
                                    <span className="text-gray-400 text-sm">Visual Description:</span>
                                    <p className="text-gray-300 mt-1">{chunk.visual_description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-400">Scene Type:</span>
                                      <div className="text-white font-medium capitalize">{chunk.scene_type}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Content Type:</span>
                                      <div className="text-white font-medium capitalize">{chunk.content_type}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Quality Metrics</h4>
                                <div className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Visual Quality:</span>
                                    <div className="text-white font-medium">{Math.round((chunk.visual_quality || 0) * 100)}%</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Audio Quality:</span>
                                    <div className="text-white font-medium">{Math.round((chunk.audio_quality || 0) * 100)}%</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Engagement Score:</span>
                                    <div className="text-white font-medium">{Math.round((chunk.engagement_score || 0) * 100)}%</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Hook Potential:</span>
                                    <div className="text-white font-medium">{Math.round((chunk.hook_potential || 0) * 100)}%</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Platform Scores</h4>
                                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                                  {chunk.platform_optimization && (
                                    <>
                                      <div className="flex justify-between items-center">
                                        <span className="text-pink-300">TikTok</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 bg-gray-600 rounded-full h-2">
                                            <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${chunk.platform_optimization.tiktok_score * 100}%` }}></div>
                                          </div>
                                          <span className="text-white text-sm font-medium">{Math.round(chunk.platform_optimization.tiktok_score * 100)}%</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-red-300">YouTube</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 bg-gray-600 rounded-full h-2">
                                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${chunk.platform_optimization.youtube_score * 100}%` }}></div>
                                          </div>
                                          <span className="text-white text-sm font-medium">{Math.round(chunk.platform_optimization.youtube_score * 100)}%</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-purple-300">Instagram</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 bg-gray-600 rounded-full h-2">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${chunk.platform_optimization.instagram_score * 100}%` }}></div>
                                          </div>
                                          <span className="text-white text-sm font-medium">{Math.round(chunk.platform_optimization.instagram_score * 100)}%</span>
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-gray-600">
                                        <span className="text-gray-400 text-sm">Best Platform:</span>
                                        <div className="text-white font-semibold capitalize">{chunk.platform_optimization.best_platform}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {chunk.cut_points && (
                                <div>
                                  <h4 className="text-lg font-semibold text-white mb-3">Cut Points Analysis</h4>
                                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                                    {chunk.cut_points.natural_cuts && chunk.cut_points.natural_cuts.length > 0 && (
                                      <div>
                                        <span className="text-green-400 text-sm font-medium">Natural Cuts: {chunk.cut_points.natural_cuts.length}</span>
                                      </div>
                                    )}
                                    {chunk.cut_points.power_moments && chunk.cut_points.power_moments.length > 0 && (
                                      <div>
                                        <span className="text-yellow-400 text-sm font-medium">Power Moments: {chunk.cut_points.power_moments.length}</span>
                                      </div>
                                    )}
                                    {chunk.cut_points.avoid_zones && chunk.cut_points.avoid_zones.length > 0 && (
                                      <div>
                                        <span className="text-red-400 text-sm font-medium">Avoid Zones: {chunk.cut_points.avoid_zones.length}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'transcript' && (transcriptData?.has_transcript || transcriptData?.data) ? (
              <div className="h-full overflow-y-auto">
                {/* Enhanced Transcript Display */}
                <div className="max-w-5xl mx-auto p-8">
                  {transcriptData.data ? (
                    <div className="space-y-6">
                      {/* Header with stats */}
                      <div className="bg-gray-800/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="text-2xl">📄</span> Video Transcript
                          </h3>
                          {typeof transcriptData.data === 'string' && (
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>Words: {transcriptData.data.split(/\s+/).length}</span>
                              <span>•</span>
                              <span>Est. reading time: {Math.ceil(transcriptData.data.split(/\s+/).length / 200)} min</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              if (typeof transcriptData.data === 'string') {
                                navigator.clipboard.writeText(transcriptData.data);
                                // Could add a toast notification here
                              }
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                            </svg>
                            Copy Transcript
                          </button>
                        </div>
                      </div>

                      {/* Transcript content */}
                      <div className="bg-gray-800/50 rounded-xl p-8">
                        {typeof transcriptData.data === 'string' ? (
                          <div className="space-y-4">
                            {(() => {
                              // Split transcript into paragraphs for better readability
                              const paragraphs = transcriptData.data
                                .split(/\n\n+/)
                                .filter(p => p.trim())
                                .map(p => p.trim());
                              
                              if (paragraphs.length === 1) {
                                // If no natural paragraphs, split by sentences
                                const sentences = transcriptData.data
                                  .split(/(?<=[.!?])\s+/)
                                  .filter(s => s.trim());
                                
                                // Group sentences into paragraphs of 3-5 sentences
                                const groupedParagraphs = [];
                                for (let i = 0; i < sentences.length; i += 4) {
                                  groupedParagraphs.push(
                                    sentences.slice(i, i + 4).join(' ')
                                  );
                                }
                                
                                return groupedParagraphs.map((paragraph, index) => (
                                  <div
                                    key={index}
                                    className="group relative pl-8 border-l-2 border-gray-700 hover:border-gray-600 transition-colors"
                                  >
                                    <div className="absolute left-0 top-0 w-8 h-8 -ml-4 bg-gray-700 group-hover:bg-gray-600 rounded-full flex items-center justify-center text-xs text-gray-400 group-hover:text-white transition-colors">
                                      {index + 1}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed text-base">
                                      {paragraph}
                                    </p>
                                  </div>
                                ));
                              } else {
                                // Natural paragraphs exist
                                return paragraphs.map((paragraph, index) => (
                                  <div
                                    key={index}
                                    className="group relative pl-8 border-l-2 border-gray-700 hover:border-gray-600 transition-colors"
                                  >
                                    <div className="absolute left-0 top-0 w-8 h-8 -ml-4 bg-gray-700 group-hover:bg-gray-600 rounded-full flex items-center justify-center text-xs text-gray-400 group-hover:text-white transition-colors">
                                      {index + 1}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed text-base">
                                      {paragraph}
                                    </p>
                                  </div>
                                ));
                              }
                            })()}
                          </div>
                        ) : (
                          // Structured transcript data
                          <div className="space-y-4">
                            {Array.isArray(transcriptData.data) ? (
                              // If it's an array of segments
                              transcriptData.data.map((segment: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                                >
                                  {segment.timestamp && (
                                    <div className="text-sm text-gray-400 mb-2">
                                      {segment.timestamp}
                                    </div>
                                  )}
                                  <p className="text-gray-300 leading-relaxed">
                                    {segment.text || JSON.stringify(segment)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              // Fallback for other structures
                              <div className="bg-gray-700/50 rounded-lg p-6">
                                <pre className="whitespace-pre-wrap text-gray-300 text-sm overflow-x-auto">
                                  {JSON.stringify(transcriptData.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Transcript tips */}
                      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <span className="text-xl">💡</span> Pro Tips
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>Use this transcript to create captions, subtitles, or blog posts from your video content</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>Search for key phrases to find specific moments in your video</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>Copy sections for social media quotes or marketing materials</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 rounded-xl p-12">
                      <div className="text-center">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v10h8V6H6z" clipRule="evenodd" />
                          </svg>
                          <p className="text-lg font-medium">No transcript available</p>
                          <p className="text-sm mt-2">Transcripts will appear here once your video is processed</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'gemini' && geminiAnalysisData ? (
              <div className="h-full overflow-y-auto">
                {/* Full Screen Gemini Analysis Layout */}
                <div className="max-w-7xl mx-auto p-8 space-y-8">
                  {/* Video Overview Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Video Overview</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Duration</label>
                          <div className="text-2xl font-bold text-white">
                            {formatMinutesToTime(geminiAnalysisData.duration / 60)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-300">Total Chunks</label>
                          <div className="text-2xl font-bold text-purple-400">
                            {geminiAnalysisData.chunks.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Pacing Assessment</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {geminiAnalysisData.overall_pacing_assessment}
                      </p>
                    </div>

                    {videoSrc && (
                      <div className="bg-gray-700/50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Video Player</h3>
                        <video
                          ref={setVideoElement}
                          src={videoSrc}
                          controls
                          className="w-full rounded-lg shadow-lg"
                          style={{ maxHeight: '200px' }}
                        />
                        {selectedGeminiChunk !== null && geminiAnalysisData && (
                          <div className="mt-3 text-center">
                            <button
                              onClick={() => playGeminiChunk(selectedGeminiChunk)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              ▶ Play Chunk {selectedGeminiChunk + 1}
                            </button>
                            <div className="text-xs text-gray-400 mt-2">
                              {formatMinutesToTime(geminiAnalysisData.chunks[selectedGeminiChunk].start_time)} - {formatMinutesToTime(geminiAnalysisData.chunks[selectedGeminiChunk].end_time)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Left Column - Recommended Cuts */}
                    <div className="space-y-8">
                      {geminiAnalysisData.recommended_cuts_or_trims && geminiAnalysisData.recommended_cuts_or_trims.length > 0 && (
                        <div className="bg-gray-700/30 rounded-xl p-6">
                          <h3 className="text-2xl font-bold text-white mb-6">Recommended Cuts ({geminiAnalysisData.recommended_cuts_or_trims.length})</h3>
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {geminiAnalysisData.recommended_cuts_or_trims.map((cut, index) => (
                              <div key={index} className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 hover:bg-red-900/30 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="text-base text-red-400 font-semibold">
                                    {formatMinutesToTime(cut.start_time)} - {formatMinutesToTime(cut.end_time)}
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    cut.priority === 'high' ? 'bg-red-600 text-white' :
                                    cut.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                    {cut.priority}
                                  </span>
                                </div>
                                <p className="text-gray-300 leading-relaxed">
                                  {cut.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Highlight Moments */}
                    <div className="space-y-8">
                      {geminiAnalysisData.highlight_moments_worth_emphasizing && geminiAnalysisData.highlight_moments_worth_emphasizing.length > 0 && (
                        <div className="bg-gray-700/30 rounded-xl p-6">
                          <h3 className="text-2xl font-bold text-white mb-6">Highlight Moments ({geminiAnalysisData.highlight_moments_worth_emphasizing.length})</h3>
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {geminiAnalysisData.highlight_moments_worth_emphasizing.map((highlight, index) => (
                              <div key={index} className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 hover:bg-yellow-900/30 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="text-base text-yellow-400 font-semibold">
                                    {formatMinutesToTime(highlight.start_time)} - {formatMinutesToTime(highlight.end_time)}
                                  </div>
                                  <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-medium capitalize">
                                    {highlight.emphasis_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-gray-300 leading-relaxed mb-3">
                                  {highlight.description}
                                </p>
                                <div className="text-sm text-yellow-300 bg-yellow-900/20 rounded-lg p-3">
                                  <strong>Enhancement:</strong> {highlight.suggested_enhancement}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Chunks Section */}
                  <div className="bg-gray-700/30 rounded-xl p-6 mt-8">
                    <h3 className="text-2xl font-bold text-white mb-6">Video Chunks ({geminiAnalysisData.chunks.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {geminiAnalysisData.chunks.map((chunk, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedGeminiChunk(index)}
                          className={`text-left p-4 rounded-lg transition-all hover:scale-[1.02] ${
                            selectedGeminiChunk === index 
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          <div className="text-sm font-semibold mb-2">
                            {formatMinutesToTime(chunk.start_time)} - {formatMinutesToTime(chunk.end_time)}
                          </div>
                          <div className="text-xs opacity-75 capitalize mb-2">
                            {chunk.scene_type}
                          </div>
                          <div className="text-xs opacity-60 line-clamp-2">
                            {chunk.visual_description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Chunk Detail */}
                  {selectedGeminiChunk !== null && geminiAnalysisData.chunks[selectedGeminiChunk] && (
                    <div className="bg-gray-700/30 rounded-xl p-6 mt-8">
                      <h3 className="text-2xl font-bold text-white mb-6">
                        Chunk {selectedGeminiChunk + 1} Details
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-white mb-3">Visual Description</h4>
                            <p className="text-gray-300 leading-relaxed bg-gray-800/50 rounded-lg p-4">
                              {geminiAnalysisData.chunks[selectedGeminiChunk].visual_description}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-3">Key Elements</h4>
                            <div className="flex flex-wrap gap-2">
                              {geminiAnalysisData.chunks[selectedGeminiChunk].key_elements.map((element, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                                  {element}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3">Editing Suggestions</h4>
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-300 leading-relaxed">
                              {geminiAnalysisData.chunks[selectedGeminiChunk].editing_suggestions}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <div className="flex h-full">
              {/* Left sidebar - Overall Metrics */}
              <div className="w-80 bg-gray-750 border-r border-gray-600 p-6 overflow-y-auto flex-shrink-0">
                <h3 className="text-lg font-semibold text-white mb-4">Overall Metrics</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Clip Quality</label>
                    <div className={`text-lg font-semibold ${getQualityColor(analysisData.overallMetrics.clipQuality)}`}>
                      {analysisData.overallMetrics.clipQuality}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">Script Alignment Score</label>
                    <div className={`text-lg font-semibold ${getConfidenceColor(analysisData.overallMetrics.scriptAlignmentScore)}`}>
                      {(analysisData.overallMetrics.scriptAlignmentScore * 100).toFixed(0)}%
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${analysisData.overallMetrics.scriptAlignmentScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">Editing Viability</label>
                    <div className={`text-lg font-semibold ${getConfidenceColor(analysisData.overallMetrics.editingViability)}`}>
                      {(analysisData.overallMetrics.editingViability * 100).toFixed(0)}%
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${analysisData.overallMetrics.editingViability * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">Script Usability</label>
                    <div className="text-white capitalize">
                      {analysisData.overallMetrics.scriptUsability.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">Recommended Role</label>
                    <div className="text-white capitalize">
                      {analysisData.overallMetrics.recommendedScriptRole.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* Scene List */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-white mb-3">Scenes ({analysisData.sceneAnalysis.length})</h4>
                  <div className="space-y-2">
                    {analysisData.sceneAnalysis.map((scene, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedScene(index)}
                        className={`w-full text-left p-3 rounded transition-colors ${
                          selectedScene === index 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {formatTimeRange(scene.timeRange)}
                        </div>
                        <div className="text-xs opacity-75 capitalize">
                          {scene.contentType} • {scene.significance}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right content - Scene Details and Video Player */}
              <div className="flex-1 flex flex-col">
                {/* Video Player */}
                {videoSrc && (
                  <div className="border-b border-gray-600 p-4 bg-gray-850 flex-shrink-0">
                    <div className="max-w-md mx-auto">
                      <video
                        ref={setVideoElement}
                        src={videoSrc}
                        controls
                        className="w-full rounded-lg shadow-lg"
                        style={{ maxHeight: '200px' }}
                      />
                      {selectedScene !== null && analysisData && (
                        <div className="mt-2 text-center">
                          <button
                            onClick={() => playScene(selectedScene)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                          >
                            Play Scene {selectedScene + 1}
                          </button>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatTimeRange(analysisData.sceneAnalysis[selectedScene].timeRange)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Scene Details - Scrollable */}
                <div className="flex-1 p-6 overflow-y-auto">
                {selectedScene !== null && analysisData.sceneAnalysis[selectedScene] ? (
                  <div className="space-y-6">
                    <div className="border-b border-gray-600 pb-4">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Scene {selectedScene + 1}: {formatTimeRange(analysisData.sceneAnalysis[selectedScene].timeRange)}
                      </h3>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-700 ${getQualityColor(analysisData.sceneAnalysis[selectedScene].contentType)}`}>
                          {analysisData.sceneAnalysis[selectedScene].contentType}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-700 ${
                          analysisData.sceneAnalysis[selectedScene].significance === 'high' ? 'text-red-400' :
                          analysisData.sceneAnalysis[selectedScene].significance === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {analysisData.sceneAnalysis[selectedScene].significance} significance
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Visual & Audio Descriptions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">Visual Description</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {analysisData.sceneAnalysis[selectedScene].visualDescription}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">Audio Description</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {analysisData.sceneAnalysis[selectedScene].audioDescription}
                          </p>
                        </div>

                        <div className="flex space-x-4">
                          <div>
                            <label className="text-sm font-medium text-gray-400">Visual Quality</label>
                            <div className={`text-lg font-semibold ${getQualityColor(analysisData.sceneAnalysis[selectedScene].visualQuality)}`}>
                              {analysisData.sceneAnalysis[selectedScene].visualQuality}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-400">Speech Quality</label>
                            <div className={`text-lg font-semibold ${getQualityColor(analysisData.sceneAnalysis[selectedScene].speechQuality)}`}>
                              {analysisData.sceneAnalysis[selectedScene].speechQuality}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Script Alignment */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">Script Alignment</h4>
                          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-400">Target Section</label>
                              <div className="text-white font-medium">
                                {analysisData.sceneAnalysis[selectedScene].scriptAlignment.targetScriptSection}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-400">Match Type</label>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                analysisData.sceneAnalysis[selectedScene].scriptAlignment.matchType === 'EXACT' 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-yellow-600 text-white'
                              }`}>
                                {analysisData.sceneAnalysis[selectedScene].scriptAlignment.matchType}
                              </span>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-400">Confidence</label>
                              <div className={`text-lg font-semibold ${getConfidenceColor(analysisData.sceneAnalysis[selectedScene].scriptAlignment.confidence)}`}>
                                {(analysisData.sceneAnalysis[selectedScene].scriptAlignment.confidence * 100).toFixed(0)}%
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-400">Key Phrases</label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {analysisData.sceneAnalysis[selectedScene].scriptAlignment.keyPhraseMatches.map((phrase, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                    "{phrase}"
                                  </span>
                                ))}
                              </div>
                            </div>

                            {analysisData.sceneAnalysis[selectedScene].scriptAlignment.alternativeUses.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-gray-400">Alternative Uses</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {analysisData.sceneAnalysis[selectedScene].scriptAlignment.alternativeUses.map((use, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                      {use.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Editing Insights */}
                    <div className="border-t border-gray-600 pt-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Editing Insights</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-2">Editing Notes</h5>
                          <p className="text-gray-300 text-sm">
                            {analysisData.sceneAnalysis[selectedScene].editingNotes}
                          </p>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-2">Correlation</h5>
                          <p className="text-gray-300 text-sm">
                            {analysisData.sceneAnalysis[selectedScene].correlation}
                          </p>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-3">Script Optimization</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Best Application:</span>
                              <span className="text-white">
                                {analysisData.sceneAnalysis[selectedScene].scriptOptimization.bestScriptApplication.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Narrative Role:</span>
                              <span className="text-white">
                                {analysisData.sceneAnalysis[selectedScene].scriptOptimization.narrativeRole.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Editing Complexity:</span>
                              <span className={`${
                                analysisData.sceneAnalysis[selectedScene].scriptOptimization.editingComplexity === 'low' ? 'text-green-400' :
                                analysisData.sceneAnalysis[selectedScene].scriptOptimization.editingComplexity === 'medium' ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {analysisData.sceneAnalysis[selectedScene].scriptOptimization.editingComplexity}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Script Readiness:</span>
                              <span className="text-white">
                                {analysisData.sceneAnalysis[selectedScene].scriptOptimization.scriptReadiness.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v10h8V6H6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-gray-400">Select a scene from the sidebar to view detailed analysis</p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v10h8V6H6z" clipRule="evenodd" />
                </svg>
                <p className="text-gray-400">No analysis available yet</p>
                <p className="text-gray-500 text-sm mt-2">Upload and analyze your video to see insights</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Re-analysis Modal */}
      {showReanalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <div>
                <h3 className="text-xl font-bold text-white">Re-analyze with AI</h3>
                <p className="text-gray-400 text-sm">Add additional context to improve the analysis</p>
              </div>
              <button
                onClick={() => setShowReanalysisModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Context & Annotations
                  </label>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Add any additional context, specific instructions, or annotations about this video that should be considered during the AI analysis..."
                    className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Examples: "Focus on the presentation style", "This is for a marketing campaign", "Look for technical accuracy", etc.
                  </p>
                </div>

                <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-purple-300 text-sm">
                      <p className="font-medium mb-1">Re-analysis Process:</p>
                      <ul className="list-disc list-inside space-y-1 text-purple-400">
                        <li>AI will re-process the video with your additional context</li>
                        <li>This process typically takes 2-3 minutes</li>
                        <li>You can continue using the interface while it processes</li>
                        <li>The analysis will automatically refresh when complete</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-600 p-6">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReanalysisModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReanalysis}
                  disabled={isReanalyzing}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors font-medium"
                >
                  {isReanalyzing ? 'Starting Analysis...' : 'Re-analyze with AI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* One Shot Generate Modal */}
      {geminiAnalysisData && videoSrc && (
        <OneShotGenerateModal
          isOpen={showOneShotModal}
          onClose={() => setShowOneShotModal(false)}
          videoId={videoId}
          videoName={videoName}
          videoSrc={videoSrc}
          analysisData={geminiAnalysisData}
        />
      )}
    </div>
  );
}