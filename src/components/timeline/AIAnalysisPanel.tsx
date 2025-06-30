"use client";

import React, { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '../../lib/supabase/client';

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

interface AIAnalysisPanelProps {
  videoId: string;
  videoName: string;
  videoSrc?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIAnalysisPanel({ videoId, videoName, videoSrc, isOpen, onClose }: AIAnalysisPanelProps) {
  const [analysisData, setAnalysisData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [showReanalysisModal, setShowReanalysisModal] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisStatus, setReanalysisStatus] = useState<'idle' | 'processing' | 'polling' | 'completed' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
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

      if (data.has_analysis && data.analysis_data) {
        setAnalysisData(data.analysis_data);
        // Auto-select first scene if available
        if (data.analysis_data.sceneAnalysis && data.analysis_data.sceneAnalysis.length > 0) {
          setSelectedScene(0);
        }
      } else {
        setError('No analysis data available for this video');
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

  useEffect(() => {
    if (selectedScene !== null && videoElement && analysisData) {
      playScene(selectedScene);
    }
  }, [selectedScene, videoElement, analysisData]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
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
            {/* Re-analysis Button */}
            {analysisData && !isReanalyzing && (
              <button
                onClick={() => setShowReanalysisModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span>Re-analyze with AI</span>
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

        {/* Content */}
        <div className="flex-1 overflow-scroll">
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
          ) : analysisData ? (
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
          ) : null}
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
    </div>
  );
}