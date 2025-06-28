"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { interpolate } from 'remotion';

type Size = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export const useElementSize = (
  ref: React.RefObject<HTMLElement | null>,
): Size | null => {
  const [size, setSize] = useState<Size | null>(() => {
    if (!ref.current) {
      return null;
    }

    const rect = ref.current.getClientRects();
    if (!rect[0]) {
      return null;
    }

    return {
      width: rect[0].width as number,
      height: rect[0].height as number,
      left: rect[0].x as number,
      top: rect[0].y as number,
    };
  });

  const observer = useMemo(() => {
    if (typeof ResizeObserver === 'undefined') {
      return null;
    }

    return new ResizeObserver((entries) => {
      const { target } = entries[0];
      const newSize = target.getClientRects();

      if (!newSize?.[0]) {
        setSize(null);
        return;
      }

      const { width } = newSize[0];
      const { height } = newSize[0];

      setSize({
        width,
        height,
        left: newSize[0].x,
        top: newSize[0].y,
      });
    });
  }, []);

  const updateSize = useCallback(() => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getClientRects();
    if (!rect[0]) {
      setSize(null);
      return;
    }

    setSize((prevState) => {
      const isSame =
        prevState &&
        prevState.width === rect[0].width &&
        prevState.height === rect[0].height &&
        prevState.left === rect[0].x &&
        prevState.top === rect[0].y;
      if (isSame) {
        return prevState;
      }

      return {
        width: rect[0].width as number,
        height: rect[0].height as number,
        left: rect[0].x as number,
        top: rect[0].y as number,
      };
    });
  }, [ref]);

  useEffect(() => {
    if (!observer) {
      return;
    }

    const { current } = ref;
    if (current) {
      observer.observe(current);
    }

    return (): void => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [observer, ref, updateSize]);

  useEffect(() => {
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  return useMemo(() => {
    if (!size) {
      return null;
    }

    return { ...size, refresh: updateSize };
  }, [size, updateSize]);
};

const getFrameFromX = (
  clientX: number,
  durationInFrames: number,
  width: number,
) => {
  const pos = clientX;
  const frame = Math.round(
    interpolate(pos, [0, width], [0, Math.max(durationInFrames - 1, 0)], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return frame;
};

const BAR_HEIGHT = 4;
const KNOB_SIZE = 12;
const VERTICAL_PADDING = 4;

const containerStyle: React.CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  paddingTop: VERTICAL_PADDING,
  paddingBottom: VERTICAL_PADDING,
  boxSizing: 'border-box',
  cursor: 'pointer',
  position: 'relative',
  touchAction: 'none',
  flex: 1,
  marginLeft: 12,
  marginRight: 12,
};

const barBackground: React.CSSProperties = {
  height: BAR_HEIGHT,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  width: '100%',
  borderRadius: BAR_HEIGHT / 2,
};

export const useHoverState = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const { current } = ref;
    if (!current) {
      return;
    }

    const onHover = () => {
      setHovered(true);
    };

    const onLeave = () => {
      setHovered(false);
    };

    current.addEventListener('mouseenter', onHover);
    current.addEventListener('mouseleave', onLeave);

    return () => {
      current.removeEventListener('mouseenter', onHover);
      current.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);
  return hovered;
};

export const SeekBar: React.FC<{
  durationInFrames: number;
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({ durationInFrames, playerRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barHovered = useHoverState(containerRef);
  const size = useElementSize(containerRef);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const { current } = playerRef;
    if (!current) {
      return;
    }

    const onFrameUpdate = () => {
      setFrame(current.getCurrentFrame());
    };

    current.addEventListener('frameupdate', onFrameUpdate);

    return () => {
      current.removeEventListener('frameupdate', onFrameUpdate);
    };
  }, [playerRef]);

  useEffect(() => {
    const { current } = playerRef;
    if (!current) {
      return;
    }

    const onPlay = () => {
      setPlaying(true);
    };

    const onPause = () => {
      setPlaying(false);
    };

    current.addEventListener('play', onPlay);
    current.addEventListener('pause', onPause);

    return () => {
      current.removeEventListener('play', onPlay);
      current.removeEventListener('pause', onPause);
    };
  }, [playerRef]);

  const [dragging, setDragging] = useState<
    | {
        dragging: false;
      }
    | {
        dragging: true;
        wasPlaying: boolean;
      }
  >({
    dragging: false,
  });

  const width = size?.width ?? 0;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) {
        return;
      }

      if (!playerRef.current) {
        return;
      }

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number;

      const _frame = getFrameFromX(
        e.clientX - posLeft,
        durationInFrames,
        width,
      );
      playerRef.current.pause();
      playerRef.current.seekTo(_frame);
      setDragging({
        dragging: true,
        wasPlaying: playing,
      });
    },
    [durationInFrames, width, playerRef, playing],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!size) {
        return;
      }

      if (!dragging.dragging) {
        return;
      }

      if (!playerRef.current) {
        return;
      }

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number;

      const _frame = getFrameFromX(
        e.clientX - posLeft,
        durationInFrames,
        size.width,
      );
      playerRef.current.seekTo(_frame);
    },
    [dragging.dragging, durationInFrames, playerRef, size],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.dragging) {
      return;
    }

    if (!playerRef.current) {
      return;
    }

    setDragging({
      dragging: false,
    });

    if (dragging.wasPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [dragging, playerRef]);

  useEffect(() => {
    if (!dragging.dragging) {
      return;
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging.dragging, onPointerMove, onPointerUp]);

  const knobStyle: React.CSSProperties = useMemo(() => {
    return {
      height: KNOB_SIZE,
      width: KNOB_SIZE,
      borderRadius: KNOB_SIZE / 2,
      position: 'absolute',
      top: VERTICAL_PADDING - KNOB_SIZE / 2 + BAR_HEIGHT / 2,
      backgroundColor: '#fff',
      left: Math.max(
        0,
        (frame / Math.max(1, durationInFrames - 1)) * width - KNOB_SIZE / 2,
      ),
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      opacity: barHovered || dragging.dragging ? 1 : 0.8,
      transition: 'opacity 0.2s ease',
    };
  }, [barHovered, durationInFrames, frame, width, dragging.dragging]);

  const fillStyle: React.CSSProperties = useMemo(() => {
    return {
      height: BAR_HEIGHT,
      backgroundColor: '#fff',
      width: (frame / Math.max(1, durationInFrames - 1)) * 100 + '%',
      borderRadius: BAR_HEIGHT / 2,
    };
  }, [durationInFrames, frame]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      style={containerStyle}
    >
      <div style={barBackground}>
        <div style={fillStyle} />
      </div>
      <div style={knobStyle} />
    </div>
  );
};