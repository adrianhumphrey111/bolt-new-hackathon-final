'use client';

import { useState, useEffect } from 'react';
import { FiScissors, FiCheck, FiClock, FiAlertCircle, FiX } from 'react-icons/fi';

interface CutDetectionProgressProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cuts: any[]) => void;
  videoId: string;
  videoName: string;
  cutOptions: {
    cutTypes: string[];
    customPrompt?: string;
    confidenceThreshold: number;
  };
}

interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  progress?: number;
}

const initialSteps: ProgressStep[] = [
  { id: 'validation', name: 'Validating video analysis', status: 'pending' },
  { id: 'chunking', name: 'Processing transcript chunks', status: 'pending' },
  { id: 'detection', name: 'AI cut detection', status: 'pending' },
  { id: 'validation_cuts', name: 'Validating detected cuts', status: 'pending' },
  { id: 'storage', name: 'Storing results', status: 'pending' }
];

export function CutDetectionProgress({
  isOpen,
  onClose,
  onComplete,
  videoId,
  videoName,
  cutOptions
}: CutDetectionProgressProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedCuts, setDetectedCuts] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state when modal opens
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setIsComplete(false);
    setHasError(false);
    setErrorMessage('');
    setDetectedCuts([]);
    setStartTime(Date.now());

    // Start the cut detection process
    startCutDetection();
  }, [isOpen]);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const updateStep = (stepId: string, status: ProgressStep['status'], message?: string, progress?: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, progress }
        : step
    ));
  };

  const moveToNextStep = () => {
    setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const startCutDetection = async () => {
    try {
      // Step 1: Validation
      updateStep('validation', 'processing', 'Checking video analysis status...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
      updateStep('validation', 'completed');
      moveToNextStep();

      // Step 2: Chunking
      updateStep('chunking', 'processing', 'Breaking transcript into chunks...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('chunking', 'completed');
      moveToNextStep();

      // Step 3: AI Detection
      updateStep('detection', 'processing', 'AI analyzing content for cuts...');
      
      const response = await fetch(`/api/videos/${videoId}/detect-cuts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cutOptions)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Cut detection failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Cut detection failed');
      }

      updateStep('detection', 'completed', `Found ${result.totalCuts} potential cuts`);
      moveToNextStep();

      // Step 4: Validation
      updateStep('validation_cuts', 'processing', 'Validating detected cuts...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('validation_cuts', 'completed');
      moveToNextStep();

      // Step 5: Storage
      updateStep('storage', 'processing', 'Saving results...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('storage', 'completed');

      // Complete
      setDetectedCuts(result.cuts || []);
      setIsComplete(true);

    } catch (error) {
      console.error('Cut detection error:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Mark current step as error
      const currentStep = steps[currentStepIndex];
      updateStep(currentStep.id, 'error', error instanceof Error ? error.message : 'Failed');
    }
  };

  const handleClose = () => {
    if (isComplete && detectedCuts.length > 0) {
      onComplete(detectedCuts);
    }
    onClose();
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FiScissors className="w-5 h-5 text-blue-400" />
              Analyzing Video for Cuts
            </h2>
            <p className="text-gray-400 text-sm mt-1">{videoName}</p>
          </div>
          {(isComplete || hasError) && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.status === 'completed' ? FiCheck 
                         : step.status === 'error' ? FiAlertCircle
                         : step.status === 'processing' ? FiClock
                         : FiClock;

              return (
                <div key={step.id} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-600' :
                    step.status === 'error' ? 'bg-red-600' :
                    step.status === 'processing' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }`}>
                    {step.status === 'processing' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Icon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${
                        step.status === 'completed' ? 'text-green-400' :
                        step.status === 'error' ? 'text-red-400' :
                        step.status === 'processing' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {step.name}
                      </h3>
                      {step.status === 'processing' && step.progress && (
                        <span className="text-sm text-gray-400">{step.progress}%</span>
                      )}
                    </div>
                    {step.message && (
                      <p className="text-sm text-gray-300 mt-1">{step.message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results or Error */}
        {isComplete && (
          <div className="p-6 border-t border-gray-700">
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiCheck className="w-5 h-5 text-green-400" />
                <h3 className="text-green-400 font-medium">Analysis Complete!</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Found {detectedCuts.length} potential cuts. Processing took {formatTime(elapsedTime)}.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Review Cuts
                </button>
              </div>
            </div>
          </div>
        )}

        {hasError && (
          <div className="p-6 border-t border-gray-700">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiAlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-red-400 font-medium">Analysis Failed</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">{errorMessage}</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setHasError(false);
                    setErrorMessage('');
                    setSteps(initialSteps);
                    setCurrentStepIndex(0);
                    startCutDetection();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer with elapsed time */}
        {!isComplete && !hasError && (
          <div className="p-6 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Processing video cuts...</span>
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}