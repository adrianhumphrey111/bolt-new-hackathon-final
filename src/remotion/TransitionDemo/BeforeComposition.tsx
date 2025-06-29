import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { NextLogo } from '../MyComp/NextLogo';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});

export const BeforeComposition: React.FC = () => {
  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-900 to-purple-900">
      {/* First clip - Next.js Logo */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill className="justify-center items-center">
          <NextLogo outProgress={0} />
          <div className="absolute bottom-20 text-center">
            <h2 
              className="text-3xl font-bold text-white"
              style={{ fontFamily }}
            >
              Clip 1: Next.js Logo
            </h2>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Second clip - Text Animation */}
      <Sequence from={90} durationInFrames={90}>
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
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};