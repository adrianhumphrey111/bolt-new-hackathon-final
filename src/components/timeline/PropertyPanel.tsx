"use client";

import React, { useState, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { MediaType } from '../../../types/timeline';

export function PropertyPanel() {
  const { state, actions } = useTimeline();
  const { selectedItems, tracks, fps } = state;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get the selected item
  const selectedItem = selectedItems.length === 1 
    ? tracks.flatMap(track => track.items).find(item => selectedItems.includes(item.id))
    : null;

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    startTime: 0,
    duration: 0,
    content: '',
  });

  useEffect(() => {
    if (selectedItem) {
      setFormData({
        name: selectedItem.name,
        startTime: selectedItem.startTime,
        duration: selectedItem.duration,
        content: selectedItem.content || '',
      });
    }
  }, [selectedItem]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    actions.updateItem(selectedItem.id, {
      name: formData.name,
      startTime: Number(formData.startTime),
      duration: Number(formData.duration),
      content: formData.content || undefined,
    });
  };

  const handleSplit = () => {
    if (!selectedItem) return;
    
    const splitPoint = selectedItem.startTime + Math.floor(selectedItem.duration / 2);
    actions.splitItem(selectedItem.id, splitPoint);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    actions.removeItem(selectedItem.id);
  };

  const formatTime = (frames: number) => {
    const totalSeconds = frames / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frameRemainder = Math.floor(frames % fps);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}:${frameRemainder.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    const frames = parseInt(parts[2]) || 0;
    
    return (minutes * 60 + seconds) * fps + frames;
  };

  return (
    <div className={`bg-gray-800 border-l border-gray-600 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        {!isCollapsed && (
          <h3 className="text-white font-medium">Properties</h3>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <svg 
            className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3">
          {selectedItems.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4V6h12v10z" clipRule="evenodd" />
                </svg>
              </div>
              <p>Select an item to edit its properties</p>
            </div>
          )}

          {selectedItems.length > 1 && (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">Multiple items selected</p>
              <div className="space-y-2">
                <button
                  onClick={() => selectedItems.forEach(id => actions.removeItem(id))}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Delete Selected ({selectedItems.length})
                </button>
                <button
                  onClick={() => actions.selectItems([])}
                  className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {selectedItem && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Info */}
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded ${
                    selectedItem.type === MediaType.VIDEO ? 'bg-blue-500' :
                    selectedItem.type === MediaType.AUDIO ? 'bg-green-500' :
                    selectedItem.type === MediaType.IMAGE ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`} />
                  <span className="text-sm text-gray-300 capitalize">
                    {selectedItem.type}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  ID: {selectedItem.id}
                </div>
              </div>

              {/* Basic Properties */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={formatTime(formData.startTime)}
                      onChange={(e) => handleInputChange('startTime', parseTime(e.target.value))}
                      placeholder="0:00:00"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={formatTime(formData.duration)}
                      onChange={(e) => handleInputChange('duration', parseTime(e.target.value))}
                      placeholder="0:00:00"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none text-sm font-mono"
                    />
                  </div>
                </div>

                {selectedItem.type === MediaType.TEXT && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Text Content
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                )}

                {selectedItem.src && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Source
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm break-all">
                      {selectedItem.src}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-600">
                <button
                  type="submit"
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Apply Changes
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSplit}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors text-sm"
                  >
                    Split
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Transform */}
              <div className="pt-4 border-t border-gray-600">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Transform</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">X Position</label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Y Position</label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Scale</label>
                    <input
                      type="number"
                      defaultValue={1}
                      step={0.1}
                      min={0.1}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rotation</label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}