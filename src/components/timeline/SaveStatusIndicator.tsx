"use client";

import React from 'react';
import { useTimelinePersistence } from './TimelineContext';

export function SaveStatusIndicator() {
  const { persistence, actions } = useTimelinePersistence();

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = () => {
    switch (persistence.saveStatus) {
      case 'saved': return 'text-green-400';
      case 'saving': return 'text-blue-400';
      case 'loading': return 'text-blue-400';
      case 'error': return 'text-red-400';
      case 'unsaved': return 'text-yellow-400';
      case 'conflict': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (persistence.saveStatus) {
      case 'saved':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'saving':
        return (
          <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case 'loading':
        return (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'unsaved':
        return (
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
        );
      case 'conflict':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (persistence.saveStatus) {
      case 'saved':
        return persistence.lastSaved 
          ? `Saved ${formatRelativeTime(persistence.lastSaved)}`
          : 'Saved';
      case 'saving':
        return 'Saving...';
      case 'loading':
        return 'Loading timeline...';
      case 'error':
        return 'Save failed';
      case 'unsaved':
        return 'Unsaved changes';
      case 'conflict':
        return 'Conflict detected';
      default:
        return 'Unknown status';
    }
  };

  const handleManualSave = () => {
    actions.saveTimeline('manually_saved');
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Status indicator */}
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-xs font-medium">
          {getStatusText()}
        </span>
      </div>

      {/* Manual save button */}
      {persistence.hasUnsavedChanges && (
        <button
          onClick={handleManualSave}
          disabled={persistence.isSaving}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          title="Save timeline manually (Ctrl/Cmd + S)"
        >
          {persistence.isSaving ? 'Saving...' : 'Save'}
        </button>
      )}

      {/* Error details */}
      {persistence.error && (
        <div 
          className="text-xs text-red-400 cursor-help" 
          title={persistence.error}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Auto-save toggle (optional, for advanced users) */}
      <div className="hidden lg:flex items-center space-x-1 text-xs text-gray-400">
        <input
          type="checkbox"
          id="auto-save"
          checked={true} // Auto-save is always enabled for now
          onChange={(e) => actions.enableAutoSave(e.target.checked)}
          className="w-3 h-3"
        />
        <label htmlFor="auto-save" className="cursor-pointer">
          Auto-save
        </label>
      </div>
    </div>
  );
}