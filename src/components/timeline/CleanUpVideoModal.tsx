'use client';

import { useState } from 'react';
import { FiX, FiScissors, FiMic, FiPause, FiRefreshCw, FiTrash2, FiMessageSquare, FiSliders } from 'react-icons/fi';

interface CleanUpVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: CleanUpOptions) => void;
  videoName: string;
  videoDuration: string;
  isProcessing?: boolean;
}

export interface CleanUpOptions {
  cutTypes: string[];
  customPrompt?: string;
  confidenceThreshold: number;
}

interface CutTypeOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  examples: string[];
  color: string;
  bgColor: string;
}

const cutTypeOptions: CutTypeOption[] = [
  {
    id: 'filler_words',
    name: 'Filler Words',
    description: 'Remove ums, uhs, likes, you knows, and other vocal fillers',
    icon: FiMic,
    examples: ['Um...', 'Uh...', 'Like...', 'You know...', 'Basically...'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  {
    id: 'bad_takes',
    name: 'Bad Takes', 
    description: 'Remove stuttering, false starts, mistakes, and incomplete thoughts',
    icon: FiRefreshCw,
    examples: ['Stuttering', 'False starts', 'Self-corrections', 'Obvious mistakes'],
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  },
  {
    id: 'silence',
    name: 'Long Pauses',
    description: 'Remove awkward silences and dead air longer than 2 seconds',
    icon: FiPause,
    examples: ['Dead air', 'Long pauses', 'Awkward silences', 'Processing time'],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  {
    id: 'off_topic',
    name: 'Off-Topic Content',
    description: 'Remove tangential discussions and unrelated content',
    icon: FiMessageSquare,
    examples: ['Side conversations', 'Personal anecdotes', 'Unrelated tangents', 'Interruptions'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  {
    id: 'repetitive_content',
    name: 'Repetitive Content',
    description: 'Remove duplicate information and unnecessary repetition',
    icon: FiTrash2,
    examples: ['Duplicate explanations', 'Redundant information', 'Repeated points', 'Circular discussion'],
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  }
];

export function CleanUpVideoModal({
  isOpen,
  onClose,
  onConfirm,
  videoName,
  videoDuration,
  isProcessing = false
}: CleanUpVideoModalProps) {
  const [selectedCutTypes, setSelectedCutTypes] = useState<string[]>(['filler_words']);
  const [customPrompt, setCustomPrompt] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleCutTypeToggle = (cutTypeId: string) => {
    setSelectedCutTypes(prev => 
      prev.includes(cutTypeId)
        ? prev.filter(id => id !== cutTypeId)
        : [...prev, cutTypeId]
    );
  };

  const handleConfirm = () => {
    if (selectedCutTypes.length === 0) return;
    
    const options: CleanUpOptions = {
      cutTypes: selectedCutTypes,
      customPrompt: customPrompt.trim() || undefined,
      confidenceThreshold
    };
    
    onConfirm(options);
  };

  const getConfidenceLabel = (threshold: number) => {
    if (threshold >= 0.8) return 'Conservative (High Confidence)';
    if (threshold >= 0.6) return 'Balanced (Medium Confidence)';
    return 'Aggressive (Low Confidence)';
  };

  const getConfidenceDescription = (threshold: number) => {
    if (threshold >= 0.8) return 'Only remove content the AI is very confident should be cut';
    if (threshold >= 0.6) return 'Remove content the AI is moderately confident should be cut';
    return 'Remove content even if the AI has lower confidence (more cuts)';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FiScissors className="w-5 h-5 text-blue-400" />
              Clean Up Video
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              AI will analyze your video and suggest cuts to improve flow and engagement
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Video Info */}
        <div className="p-6 border-b border-gray-700">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">{videoName}</h3>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>Duration: {videoDuration}</span>
            </div>
          </div>
        </div>

        {/* Cut Type Selection */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">What should be removed?</h3>
          <p className="text-gray-400 text-sm mb-6">
            Select the types of content you want the AI to identify and remove from your video.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cutTypeOptions.map((cutType) => {
              const Icon = cutType.icon;
              const isSelected = selectedCutTypes.includes(cutType.id);
              
              return (
                <div
                  key={cutType.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => handleCutTypeToggle(cutType.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? cutType.bgColor : 'bg-gray-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isSelected ? cutType.color : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{cutType.name}</h4>
                      <p className="text-gray-300 text-sm mb-2">{cutType.description}</p>
                      <div className="text-xs text-gray-400">
                        Examples: {cutType.examples.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="p-6 border-b border-gray-700">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <FiSliders className="w-4 h-4" />
            <span>Advanced Options</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="space-y-6">
              {/* Confidence Threshold */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Confidence Threshold
                </label>
                <p className="text-gray-400 text-sm mb-4">
                  {getConfidenceDescription(confidenceThreshold)}
                </p>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.3"
                    max="0.9"
                    step="0.1"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Aggressive</span>
                    <span className="text-white font-medium">
                      {getConfidenceLabel(confidenceThreshold)}
                    </span>
                    <span>Conservative</span>
                  </div>
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Custom Instructions (Optional)
                </label>
                <p className="text-gray-400 text-sm mb-3">
                  Provide specific guidance for what the AI should look for or avoid cutting.
                </p>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Keep all technical explanations, be more aggressive with pauses longer than 3 seconds..."
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {customPrompt.length}/500 characters
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              <p>The AI will analyze your video and suggest cuts. You can review and apply them individually.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCutTypes.length === 0 || isProcessing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <FiScissors className="w-4 h-4" />
                    <span>Analyze Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for the slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }
      `}</style>
    </div>
  );
}