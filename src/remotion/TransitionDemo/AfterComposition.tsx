import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { NextLogo } from '../MyComp/NextLogo';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});

const FirstScene: React.FC = () => {
  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-900 to-purple-900 justify-center items-center">
      <NextLogo outProgress={0} />
      <div className="absolute bottom-20 text-center">
        <h2 
          className="text-3xl font-bold text-white"
          style={{ fontFamily }}
        >
          Clip 1: Next.js Logo
        </h2>
        <div className="mt-2 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg">
          <span className="text-green-300 text-sm">✨ With AI Transition</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SecondScene: React.FC = () => {
  return (
    <AbsoluteFill className="justify-center items-center bg-gradient-to-br from-green-900 to-blue-900">
      <div className="text-center">
        <h1 
          className="text-6xl font-bold text-white mb-4"
          style={{ fontFamily }}
        >
          Remotion
        </h1>
        <p className="text-xl text-gray-300">
          Make videos programmatically
        </p>
      </div>
      <div className="absolute bottom-20 text-center">
        <h2 
          className="text-3xl font-bold text-white"
          style={{ fontFamily }}
        >
          Clip 2: Text Animation
        </h2>
        <div className="mt-2 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg">
          <span className="text-green-300 text-sm">✨ Smooth Transition Applied</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const AfterComposition: React.FC<{ transitionType: 'fade' | 'slide' }> = ({ 
  transitionType = 'fade' 
}) => {
  const transition = transitionType === 'fade' ? fade() : slide({ direction: 'from-left' });
  
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <FirstScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={transition}
          timing={linearTiming({ durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SecondScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};