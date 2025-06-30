'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRef } from "@remotion/player";
import { TransitionDemoComposition } from "../remotion/TransitionDemo/TransitionDemoComposition";
import { FaPlay, FaPause, FaMagic, FaCheck, FaArrowRight } from 'react-icons/fa';
import { FaWandMagicSparkles as FaSparkles } from 'react-icons/fa6';

export function HeroTransitionDemo() {
  const [currentStep, setCurrentStep] = useState<'before' | 'typing' | 'processing' | 'after'>('before');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedTransition, setSelectedTransition] = useState<'fade' | 'slide'>('fade');
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<PlayerRef>(null);

  const prompts = [
    {
      text: "Add a smooth fade transition between these clips",
      type: 'fade' as const,
      result: "✨ Applied smooth fade transition • Enhanced visual flow • Professional quality"
    },
    {
      text: "Create a dynamic slide transition from left to right",
      type: 'slide' as const,
      result: "🎬 Added dynamic slide transition • Improved pacing • Cinematic effect"
    }
  ];

  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const typePrompt = async (prompt: string, transitionType: 'fade' | 'slide') => {
    setCurrentStep('typing');
    setCurrentPrompt('');
    
    // Type out the prompt
    for (let i = 0; i <= prompt.length; i++) {
      setCurrentPrompt(prompt.slice(0, i));
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    // Processing phase
    setCurrentStep('processing');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Apply transition
    setSelectedTransition(transitionType);
    setCurrentStep('after');
    
    // Reset player to beginning
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTryDemo = () => {
    const prompt = prompts[currentPromptIndex];
    typePrompt(prompt.text, prompt.type);
  };

  const handleReset = () => {
    setCurrentStep('before');
    setCurrentPrompt('');
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.pause();
      setIsPlaying(false);
    }
    // Cycle to next prompt
    setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
  };

  // Auto-cycle demo every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep === 'before') {
        handleTryDemo();
      } else if (currentStep === 'after') {
        setTimeout(handleReset, 3000);
      }
    }, currentStep === 'before' ? 8000 : currentStep === 'after' ? 5000 : 1000);

    return () => clearInterval(interval);
  }, [currentStep, currentPromptIndex]);

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
      {/* Video Player */}
      <div className="relative bg-black aspect-video">
        <Player
          ref={playerRef}
          component={TransitionDemoComposition}
          inputProps={{
            showTransition: currentStep === 'after',
            transitionType: selectedTransition,
          }}
          durationInFrames={210}
          fps={30}
          compositionHeight={720}
          compositionWidth={1280}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls={false}
          autoPlay={false}
          loop={true}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Live Demo Badge */}
        <div className="absolute top-4 left-4">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>LIVE REMOTION DEMO</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="absolute top-4 right-4">
          <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
            {currentStep === 'before' && '📹 Original Clips'}
            {currentStep === 'typing' && '⌨️ AI Processing...'}
            {currentStep === 'processing' && '🤖 Applying Transition...'}
            {currentStep === 'after' && '✨ With AI Transition'}
          </div>
        </div>

        {/* Play Controls */}
        <div className="absolute bottom-4 left-4">
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            {isPlaying ? <FaPause className="w-5 h-5 text-white" /> : <FaPlay className="w-5 h-5 text-white ml-0.5" />}
          </button>
        </div>
      </div>

      {/* AI Prompt Interface */}
      <div className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              AI Video Editor - Real Remotion Demo
            </label>
            <div className="flex items-center space-x-1">
              {prompts.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentPromptIndex === index ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={currentPrompt}
              readOnly
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="Type your editing request..."
            />
            {currentStep === 'typing' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Processing Animation */}
        {currentStep === 'processing' && (
          <div className="mb-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <span className="text-blue-300 font-medium">AI is applying transition...</span>
                <div className="text-xs text-blue-400 mt-1">
                  Analyzing clips • Generating transition • Rendering result
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {currentStep === 'after' && (
          <div className="mb-4 p-4 bg-green-600/10 border border-green-500/30 rounded-lg animate-in fade-in-0 duration-500">
            <div className="flex items-start space-x-3">
              <FaCheck className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-green-300 font-medium">Transition Applied Successfully!</p>
                <p className="text-gray-300 text-sm mt-1">{prompts[currentPromptIndex].result}</p>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="text-xs bg-green-600 text-white px-3 py-1 rounded">
                    Real Remotion Rendering
                  </div>
                  <div className="text-xs text-green-400">
                    Transition: {selectedTransition === 'fade' ? 'Smooth Fade' : 'Dynamic Slide'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {currentStep === 'before' && (
            <button
              onClick={handleTryDemo}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <FaMagic className="w-4 h-4" />
              <span>Apply AI Magic</span>
            </button>
          )}
          
          {currentStep === 'after' && (
            <>
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Try Another</span>
                <FaArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handlePlayPause}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center space-x-2"
              >
                {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </>
          )}
        </div>

        {/* Demo Info */}
        <div className="mt-4 p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-purple-300 text-sm">
            <FaSparkles className="w-4 h-4" />
            <span>
              This is a real Remotion composition with actual @remotion/transitions. 
              The AI prompt triggers live video rendering with smooth transitions between clips.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}