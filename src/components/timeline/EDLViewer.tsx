"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Film, 
  ChevronDown, 
  ChevronUp, 
  Eye,
  X,
  Calendar,
  Target,
  Scissors,
  Download
} from 'lucide-react';
import { createClientSupabaseClient } from '../../lib/supabase/client';

interface EDLViewerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EDLClip {
  clipNumber: string;
  source: string;
  fileName: string;
  videoId: string;
  timecodeIn: number;
  timecodeOut: number;
  duration: number;
  content: string;
  scriptAlignment: {
    scriptSection: string;
    matchType: string;
    confidence: number;
    keyPhrases: string[];
  };
  editorialDecision: string;
  narrativePurpose: string;
  technicalNotes: {
    cutInType: string;
    cutOutType: string;
    transition: string;
    audioHandling: string;
  };
  placementReasoning: string;
}

interface EDLData {
  project: string;
  totalClips: number;
  estimatedDuration: number;
  generated: string;
  editorialPhilosophy: string;
  scriptAlignmentStrategy: string;
  clips: EDLClip[];
}

export function EDLViewer({ projectId, isOpen, onClose }: EDLViewerProps) {
  const [edlText, setEdlText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    if (isOpen && projectId) {
      fetchEDL();
    }
  }, [isOpen, projectId]);

  const fetchEDL = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get authentication headers
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/timeline/${projectId}/edl-document`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view EDL documents');
        }
        if (response.status === 404) {
          throw new Error('No EDL document found for this project. Generate a timeline with AI first.');
        }
        throw new Error('Failed to fetch EDL document');
      }
      
      const data = await response.json();
      
      if (data.edlDocument) {
        console.log('Received EDL document');
        setEdlText(data.edlDocument);
      } else {
        setError('No EDL document found for this project. Generate a timeline with AI first.');
      }
    } catch (err) {
      console.error('Error fetching EDL:', err);
      setError(err instanceof Error ? err.message : 'Failed to load EDL document');
    } finally {
      setLoading(false);
    }
  };


  const downloadEDL = async () => {
    try {
      // Get authentication headers
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/timeline/${projectId}/edl-document`, {
        headers
      });
      const data = await response.json();
      
      if (data.edlDocument) {
        const blob = new Blob([data.edlDocument], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EDL_${projectId}_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading EDL:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Decision List (EDL)</h2>
              <p className="text-gray-400 text-sm">AI-Generated Timeline Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadEDL}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading EDL document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 mb-2">Failed to load EDL</p>
                <p className="text-gray-500 text-sm">{error}</p>
                <button
                  onClick={fetchEDL}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {edlText && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Edit Decision List</h3>
                <div className="text-sm text-gray-400">
                  AI-Generated Timeline Document
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {edlText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}