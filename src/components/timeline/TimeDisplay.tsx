"use client";

import React, { useEffect, useState } from 'react';
import type { PlayerRef } from '@remotion/player';

export const formatTime = (frame: number, fps: number): string => {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frameNumber = Math.floor(frame % fps);

  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  const frameStr = String(frameNumber).padStart(2, '0');

  return `${minutesStr}:${secondsStr}:${frameStr}`;
};

export const TimeDisplay: React.FC<{
  durationInFrames: number;
  fps: number;
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({ durationInFrames, fps, playerRef }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      console.log('⚠️ TimeDisplay: No player ref available');
      return;
    }

    const onFrameUpdate = () => {
      const newFrame = player.getCurrentFrame();
      setCurrentFrame(newFrame);
    };

    // Set initial frame
    const initialFrame = player.getCurrentFrame();
    setCurrentFrame(initialFrame);

    player.addEventListener('frameupdate', onFrameUpdate);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
    };
  }, [playerRef]);

  return (
    <div className="text-white text-sm font-mono">
      {formatTime(currentFrame, fps)} / {formatTime(durationInFrames, fps)}
    </div>
  );
};