"use client";

import React, { useState } from 'react';
import { useAuthContext } from '../AuthProvider';

// Get admin emails from environment variable (client-side check)
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

export function AdminImpersonationPanel() {
  const { session } = useAuthContext();
  const [targetEmail, setTargetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    impersonationUrl?: string;
  } | null>(null);

  // Don't show panel if user is not admin or if closed
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email) || !isVisible) {
    return null;
  }

  const handleImpersonate = async () => {
    if (!targetEmail.trim()) {
      setResult({
        success: false,
        message: 'Please enter a user email'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserEmail: targetEmail.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Successfully generated impersonation link for ${targetEmail}`,
          impersonationUrl: data.impersonationUrl
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to impersonate user'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (result?.impersonationUrl) {
      try {
        await navigator.clipboard.writeText(result.impersonationUrl);
        setResult(prev => prev ? {
          ...prev,
          message: `Link copied! Open in private browser to impersonate ${targetEmail}`
        } : null);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <h3 className="text-white font-medium text-sm">Admin Panel</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-300 hover:text-white transition-colors p-1 rounded hover:bg-red-800"
          title="Close admin panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-red-200 mb-1">
            Impersonate User (Email)
          </label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-2 py-1 text-xs bg-red-800 border border-red-600 rounded text-white placeholder-red-300 focus:outline-none focus:ring-1 focus:ring-red-500"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleImpersonate}
          disabled={isLoading || !targetEmail.trim()}
          className="w-full bg-red-700 hover:bg-red-600 disabled:bg-red-800 disabled:opacity-50 text-white text-xs py-2 px-3 rounded transition-colors"
        >
          {isLoading ? 'Generating...' : 'Impersonate User'}
        </button>

        {result && (
          <div className={`text-xs p-2 rounded ${
            result.success 
              ? 'bg-green-900 text-green-200 border border-green-700' 
              : 'bg-red-800 text-red-200 border border-red-600'
          }`}>
            <p className="mb-2">{result.message}</p>
            {result.success && result.impersonationUrl && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={result.impersonationUrl}
                  readOnly
                  className="w-full px-2 py-1 text-xs bg-green-800 border border-green-600 rounded text-green-100 font-mono text-[10px]"
                  onClick={(e) => e.currentTarget.select()}
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => setTargetEmail('')}
                    className="bg-green-800 hover:bg-green-700 text-white text-xs py-1 px-2 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-[10px] text-green-300 italic">
                  💡 Open link in private/incognito browser to avoid session conflicts
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-red-300 border-t border-red-700 pt-2">
          ⚠️ Admin-only feature. All impersonations are logged for security.
        </div>
      </div>
    </div>
  );
}