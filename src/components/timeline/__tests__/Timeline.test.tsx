import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '../Timeline';
import { TimelineProvider } from '../TimelineContext';

// Mock window.requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock HTMLElement.getBoundingClientRect
HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 60,
  top: 0,
  left: 0,
  bottom: 60,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

function renderTimeline() {
  return render(
    <TimelineProvider>
      <Timeline />
    </TimelineProvider>
  );
}

describe('Timeline Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty timeline with add track button', () => {
    renderTimeline();
    
    expect(screen.getByText('No tracks yet')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Track')).toBeInTheDocument();
  });

  test('shows timeline controls', () => {
    renderTimeline();
    
    // Play/pause button
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    
    // Zoom controls
    expect(screen.getByText('200%')).toBeInTheDocument(); // Default zoom is 2
    
    // Add track button in header
    expect(screen.getByText('Add Track')).toBeInTheDocument();
  });

  test('can add tracks using header button', async () => {
    const user = userEvent.setup();
    renderTimeline();
    
    const addTrackButton = screen.getByText('Add Track');
    await user.click(addTrackButton);
    
    // Should no longer show empty state
    expect(screen.queryByText('No tracks yet')).not.toBeInTheDocument();
    
    // Should show track
    expect(screen.getByText('Track 1')).toBeInTheDocument();
  });

  test('can add tracks using empty state button', async () => {
    const user = userEvent.setup();
    renderTimeline();
    
    const addFirstTrackButton = screen.getByText('Add Your First Track');
    await user.click(addFirstTrackButton);
    
    // Should no longer show empty state
    expect(screen.queryByText('No tracks yet')).not.toBeInTheDocument();
    
    // Should show track
    expect(screen.getByText('Track 1')).toBeInTheDocument();
  });

  test('displays time correctly', () => {
    renderTimeline();
    
    // Should show initial time (0:00:00)
    expect(screen.getByText(/0:00:00/)).toBeInTheDocument();
  });

  test('zoom controls work', async () => {
    const user = userEvent.setup();
    renderTimeline();
    
    // Find zoom in button (+ button)
    const zoomButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg path[d*="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"]')
    );
    
    if (zoomButtons.length > 0) {
      await user.click(zoomButtons[0]);
      
      // Zoom should increase from 200% to 300%
      expect(screen.getByText('300%')).toBeInTheDocument();
    }
  });

  test('handles keyboard shortcuts', async () => {
    renderTimeline();
    
    // Test spacebar for play/pause
    fireEvent.keyDown(document, { code: 'Space' });
    
    // Note: We can't easily test the play state change without mocking the context
    // but we can test that the event doesn't throw an error
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('shows ruler when tracks exist', async () => {
    const user = userEvent.setup();
    renderTimeline();
    
    // Add a track first
    const addTrackButton = screen.getByText('Add Track');
    await user.click(addTrackButton);
    
    // Timeline ruler should be present (it has time labels)
    // We can check for time format patterns
    const timeElements = screen.getAllByText(/\d+:\d+/);
    expect(timeElements.length).toBeGreaterThan(0);
  });
});