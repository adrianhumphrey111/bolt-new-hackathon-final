'use client';

import React from 'react';
import { 
  trackEvent, 
  trackVideoUpload, 
  trackAIChatInteraction,
  trackProjectCreated,
  trackTimelineOperation,
  trackPaywallInteraction
} from '../lib/analytics/gtag';

// This component is for testing analytics events in development
// Remove this component in production
export function AnalyticsTest() {
  const testEvents = [
    {
      name: 'Video Upload',
      action: () => trackVideoUpload(1024000, 'mp4', true)
    },
    {
      name: 'AI Chat Interaction',
      action: () => trackAIChatInteraction('content_discovery', true)
    },
    {
      name: 'Project Created',
      action: () => trackProjectCreated('test')
    },
    {
      name: 'Timeline Operation',
      action: () => trackTimelineOperation('add_clip', true, 1500)
    },
    {
      name: 'Paywall Shown',
      action: () => trackPaywallInteraction('shown', 'video_upload')
    },
    {
      name: 'Custom Event',
      action: () => trackEvent('test_event', { test_property: 'test_value' })
    }
  ];

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-50">
      <h3 className="text-white text-sm font-bold mb-2">Analytics Test</h3>
      <div className="space-y-1">
        {testEvents.map((event, index) => (
          <button
            key={index}
            onClick={event.action}
            className="block w-full text-left text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
          >
            {event.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Check browser console and GA4 DebugView
      </p>
    </div>
  );
}