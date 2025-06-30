import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BeforeComposition } from './BeforeComposition';
import { AfterComposition } from './AfterComposition';

export interface TransitionDemoProps {
  showTransition: boolean;
  transitionType: 'fade' | 'slide';
}

export const TransitionDemoComposition: React.FC<TransitionDemoProps> = ({ 
  showTransition, 
  transitionType 
}) => {
  return (
    <AbsoluteFill>
      {showTransition ? (
        <AfterComposition transitionType={transitionType} />
      ) : (
        <BeforeComposition />
      )}
    </AbsoluteFill>
  );
};