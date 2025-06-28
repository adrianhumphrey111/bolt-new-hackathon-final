import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineProvider, useTimeline } from '../TimelineContext';
import { MediaType } from '../../../../types/timeline';

// Test component to access timeline context
function TestComponent() {
  const { state, actions } = useTimeline();
  
  return (
    <div>
      <div data-testid="track-count">{state.tracks.length}</div>
      <div data-testid="playhead-position">{state.playheadPosition}</div>
      <div data-testid="zoom-level">{state.zoom}</div>
      <div data-testid="total-duration">{state.totalDuration}</div>
      <div data-testid="is-playing">{state.isPlaying.toString()}</div>
      
      <button 
        data-testid="add-track" 
        onClick={actions.addTrack}
      >
        Add Track
      </button>
      
      <button 
        data-testid="set-playhead"
        onClick={() => actions.setPlayheadPosition(150)}
      >
        Set Playhead to 150
      </button>
      
      <button 
        data-testid="zoom-in"
        onClick={() => actions.setZoom(state.zoom * 2)}
      >
        Zoom In
      </button>
      
      <button 
        data-testid="play-pause"
        onClick={() => actions.setPlaying(!state.isPlaying)}
      >
        Play/Pause
      </button>
      
      <button
        data-testid="add-video-item"
        onClick={() => actions.addItem({
          type: MediaType.VIDEO,
          name: 'Test Video',
          startTime: 0,
          duration: 120,
          trackId: state.tracks[0]?.id || 'new-track',
          src: '/test-video.mp4',
        })}
      >
        Add Video Item
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <TimelineProvider>
      <TestComponent />
    </TimelineProvider>
  );
}

describe('TimelineContext', () => {
  test('provides initial state correctly', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('track-count')).toHaveTextContent('0');
    expect(screen.getByTestId('playhead-position')).toHaveTextContent('0');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('2');
    expect(screen.getByTestId('total-duration')).toHaveTextContent('900');
    expect(screen.getByTestId('is-playing')).toHaveTextContent('false');
  });

  test('can add tracks', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    const addTrackButton = screen.getByTestId('add-track');
    
    await user.click(addTrackButton);
    expect(screen.getByTestId('track-count')).toHaveTextContent('1');
    
    await user.click(addTrackButton);
    expect(screen.getByTestId('track-count')).toHaveTextContent('2');
  });

  test('can set playhead position', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    const setPlayheadButton = screen.getByTestId('set-playhead');
    
    await user.click(setPlayheadButton);
    expect(screen.getByTestId('playhead-position')).toHaveTextContent('150');
  });

  test('can change zoom level', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    const zoomInButton = screen.getByTestId('zoom-in');
    
    await user.click(zoomInButton);
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('4');
  });

  test('can toggle play state', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    const playPauseButton = screen.getByTestId('play-pause');
    
    expect(screen.getByTestId('is-playing')).toHaveTextContent('false');
    
    await user.click(playPauseButton);
    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');
    
    await user.click(playPauseButton);
    expect(screen.getByTestId('is-playing')).toHaveTextContent('false');
  });

  test('can add timeline items and auto-creates tracks', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    // First add a track
    const addTrackButton = screen.getByTestId('add-track');
    await user.click(addTrackButton);
    
    expect(screen.getByTestId('track-count')).toHaveTextContent('1');
    
    // Then add a video item
    const addVideoButton = screen.getByTestId('add-video-item');
    await user.click(addVideoButton);
    
    // Track count should still be 1 since item was added to existing track
    expect(screen.getByTestId('track-count')).toHaveTextContent('1');
  });

  test('prevents playhead from going beyond bounds', async () => {
    const user = userEvent.setup();
    
    function TestBoundsComponent() {
      const { state, actions } = useTimeline();
      
      return (
        <div>
          <div data-testid="playhead-position">{state.playheadPosition}</div>
          <button 
            data-testid="set-negative"
            onClick={() => actions.setPlayheadPosition(-100)}
          >
            Set Negative
          </button>
          <button 
            data-testid="set-over-max"
            onClick={() => actions.setPlayheadPosition(1000)}
          >
            Set Over Max
          </button>
        </div>
      );
    }
    
    render(
      <TimelineProvider>
        <TestBoundsComponent />
      </TimelineProvider>
    );
    
    // Test negative value gets clamped to 0
    await user.click(screen.getByTestId('set-negative'));
    expect(screen.getByTestId('playhead-position')).toHaveTextContent('0');
    
    // Test value over max gets clamped to totalDuration
    await user.click(screen.getByTestId('set-over-max'));
    expect(screen.getByTestId('playhead-position')).toHaveTextContent('900');
  });

  test('zoom level respects min and max bounds', async () => {
    const user = userEvent.setup();
    
    function TestZoomComponent() {
      const { state, actions } = useTimeline();
      
      return (
        <div>
          <div data-testid="zoom-level">{state.zoom}</div>
          <button 
            data-testid="set-min-zoom"
            onClick={() => actions.setZoom(0.1)}
          >
            Set Below Min
          </button>
          <button 
            data-testid="set-max-zoom"
            onClick={() => actions.setZoom(20)}
          >
            Set Above Max
          </button>
        </div>
      );
    }
    
    render(
      <TimelineProvider>
        <TestZoomComponent />
      </TimelineProvider>
    );
    
    // Test zoom below min gets clamped to minZoom (0.5)
    await user.click(screen.getByTestId('set-min-zoom'));
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('0.5');
    
    // Test zoom above max gets clamped to maxZoom (10)
    await user.click(screen.getByTestId('set-max-zoom'));
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('10');
  });
});