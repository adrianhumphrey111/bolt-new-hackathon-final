"use client";

import React, { useState } from 'react';

interface ReanalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (additionalContext: string) => void;
  videoName: string;
  isProcessing: boolean;
}

export function ReanalyzeModal({
  isOpen,
  onClose,
  onConfirm,
  videoName,
  isProcessing,
}: ReanalyzeModalProps) {
  const [additionalContext, setAdditionalContext] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(additionalContext);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setAdditionalContext('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 border border-gray-600">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Reanalyze Video</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            Reanalyze video with AI to generate fresh insights:
          </p>
          <p className="text-white font-medium bg-gray-700 px-3 py-2 rounded mb-4 break-all">
            "{videoName}"
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              disabled={isProcessing}
              placeholder="Add specific instructions for the AI analysis, e.g., 'Focus on finding moments suitable for social media clips' or 'Look for technical demonstrations'"
              className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-none disabled:opacity-50"
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1">
              {additionalContext.length}/500 characters
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
            <h4 className="text-blue-300 font-medium text-sm mb-2">What happens during reanalysis:</h4>
            <ul className="text-blue-200 text-xs space-y-1">
              <li>• Fresh AI transcription and video analysis</li>
              <li>• Updated scene detection and content categorization</li>
              <li>• New editing suggestions and highlight identification</li>
              <li>• No video conversion needed (uses existing processed video)</li>
            </ul>
          </div>

          <div className="text-gray-400 text-sm">
            <strong>Note:</strong> This will replace the existing analysis data for this video. 
            The process typically takes 2-5 minutes depending on video length.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:opacity-50 text-white py-2 px-4 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-700 disabled:opacity-60 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Reanalysis...
              </>
            ) : (
              'Start Reanalysis'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}