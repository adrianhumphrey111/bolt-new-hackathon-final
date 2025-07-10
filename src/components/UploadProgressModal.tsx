import React, { useState } from 'react';
import { EnhancedUploadProgress } from './EnhancedUploadProgress';
import { UploadSession } from '../lib/uploadQueue';

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onComplete?: (session: UploadSession) => void;
  onError?: (error: Error, task: any) => void;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onComplete,
  onError,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !sessionId) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40 ${
          isMinimized ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`fixed transition-all duration-300 z-50 ${
          isMinimized 
            ? 'bottom-4 right-4 w-80 h-16' 
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[80vh]'
        }`}
      >
        <div className={`bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden h-full ${
          isMinimized ? 'cursor-pointer' : ''
        }`}>
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800"
            onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          >
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-white">
                {isMinimized ? 'Processing Videos...' : 'Video Upload & Analysis Progress'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isMinimized && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 p-6 overflow-y-auto">
              <EnhancedUploadProgress
                sessionId={sessionId}
                onComplete={(session) => {
                  onComplete?.(session);
                  onClose();
                }}
                onError={onError}
              />
            </div>
          )}
          
          {/* Minimized Preview */}
          {isMinimized && (
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Uploading...</span>
              </div>
              <div className="w-16 bg-gray-700 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full w-1/3 transition-all duration-300"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};