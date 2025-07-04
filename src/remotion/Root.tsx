import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import { TimelineComposition } from "./TimelineComposition";
import { TransitionDemoComposition } from "./TransitionDemo/TransitionDemoComposition";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { NextLogo } from "./MyComp/NextLogo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Main}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
      />
      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
      <Composition
        id="Timeline"
        component={TimelineComposition}
        durationInFrames={30000} // Large enough duration for any timeline
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          timelineState: {
            tracks: [],
            playheadPosition: 0,
            totalDuration: DURATION_IN_FRAMES,
            zoom: 1,
            fps: VIDEO_FPS,
            selectedItems: [],
            isPlaying: false,
          },
        }}
        calculateMetadata={({ props }) => {
          // Use calculated duration from API if available, otherwise calculate from items
          let actualDuration = DURATION_IN_FRAMES;
          
          if (props.timelineState?.calculatedDuration) {
            actualDuration = props.timelineState.calculatedDuration;
          } else if (props.timelineState?.tracks) {
            // Fallback: calculate from items
            const allItems = props.timelineState.tracks.flatMap(track => track.items || []);
            actualDuration = allItems.length > 0 
              ? Math.max(...allItems.map(item => item.startTime + item.duration))
              : props.timelineState.totalDuration || DURATION_IN_FRAMES;
          }
          
          const actualFps = props.timelineState?.fps || VIDEO_FPS;
          
          console.log('🎬 ROOT CALCULATE METADATA - Called with props:', {
            hasProp: !!props.timelineState,
            hasCalculatedDuration: !!props.timelineState?.calculatedDuration,
            calculatedDuration: props.timelineState?.calculatedDuration,
            totalDuration: props.timelineState?.totalDuration,
            fps: props.timelineState?.fps,
            finalActualDuration: actualDuration,
            actualFps,
            defaultDuration: DURATION_IN_FRAMES,
            defaultFps: VIDEO_FPS,
          });
          
          return {
            durationInFrames: actualDuration,
            fps: actualFps,
          };
        }}
      />
      <Composition
        id="TransitionDemo"
        component={TransitionDemoComposition}
        durationInFrames={180}
        fps={30}
        width={640}
        height={360}
        defaultProps={{
          showTransition: false,
          transitionType: "fade" as const,
        }}
      />
    </>
  );
};
