'use client';

import { useState } from 'react';
import { FiX, FiZap, FiClock, FiVideo, FiMic, FiMonitor, FiCamera, FiMapPin } from 'react-icons/fi';

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (analysisType: 'full' | 'sample') => void;
  fileName: string;
  fileSize: string;
  duration: string;
}

export function VideoAnalysisModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  fileSize,
  duration
}: VideoAnalysisModalProps) {
  const [selectedType, setSelectedType] = useState<'full' | 'sample'>('full');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Choose Analysis Type</h2>
            <p className="text-gray-400 text-sm mt-1">Select how thoroughly you want this video analyzed</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Video Info */}
        <div className="p-6 border-b border-gray-700">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">{fileName}</h3>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>Size: {fileSize}</span>
              <span>Duration: {duration}</span>
            </div>
          </div>
        </div>

        {/* Analysis Options */}
        <div className="p-6 space-y-4">
          {/* Sample Analysis Option */}
          <div
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
              selectedType === 'sample'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => setSelectedType('sample')}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                selectedType === 'sample' ? 'bg-blue-500/20' : 'bg-gray-700'
              }`}>
                <FiZap className={`w-6 h-6 ${
                  selectedType === 'sample' ? 'text-blue-400' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">Quick Analysis</h3>
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    30 seconds only
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  Fast processing for simple content. Perfect for static videos with minimal variation.
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">Best for:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiVideo className="w-4 h-4 text-blue-400" />
                      <span>Talking head videos</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiMic className="w-4 h-4 text-blue-400" />
                      <span>Lectures & presentations</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiMonitor className="w-4 h-4 text-blue-400" />
                      <span>Screen recordings</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiMic className="w-4 h-4 text-blue-400" />
                      <span>Podcast recordings</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    <span>~30 seconds processing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiZap className="w-3 h-3" />
                    <span>5 credits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Analysis Option */}
          <div
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
              selectedType === 'full'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => setSelectedType('full')}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                selectedType === 'full' ? 'bg-blue-500/20' : 'bg-gray-700'
              }`}>
                <FiCamera className={`w-6 h-6 ${
                  selectedType === 'full' ? 'text-blue-400' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">Complete Analysis</h3>
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    Full video
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  Comprehensive analysis of the entire video. Ideal for dynamic content with multiple scenes.
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">Best for:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiCamera className="w-4 h-4 text-purple-400" />
                      <span>Action & sports videos</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiMapPin className="w-4 h-4 text-purple-400" />
                      <span>Travel vlogs</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiVideo className="w-4 h-4 text-purple-400" />
                      <span>Product demos</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiCamera className="w-4 h-4 text-purple-400" />
                      <span>Event coverage</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    <span>~{Math.ceil(parseInt(duration) / 60)} minutes processing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiZap className="w-3 h-3" />
                    <span>15 credits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            You can always change this preference in your settings
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FiZap className="w-4 h-4" />
              {selectedType === 'sample' ? 'Quick Analysis' : 'Complete Analysis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}