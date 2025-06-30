"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTimeline } from './TimelineContext';
import { executeAITool, getTimelineSummary } from '../../lib/timeline-ai-tools';
import { useAuthContext } from '../AuthProvider';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function AIChatPanel({ isOpen, onClose, projectId }: AIChatPanelProps) {
  const { state, actions } = useTimeline();
  const { session } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help you edit your timeline with natural language. Try saying things like:\n\n• "Add text that says Hello World"\n• "Add a fade transition between the first and second clips"\n• "Change the duration of the first clip to 5 seconds"\n• "Add a new track"\n• "Remove the second clip"',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !session?.access_token) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if user is authenticated
      if (!session?.access_token) {
        throw new Error('Please sign in to use AI chat');
      }

      const timelineSummary = getTimelineSummary(state);
      
      const response = await fetch(`/api/timeline/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          timelineSummary,
          timeline: {
            tracks: state.tracks,
            totalDuration: state.totalDuration,
            fps: state.fps,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.action === 'executeTool') {
        // Execute the tool locally
        const toolResult = executeAITool(result.tool, result.args, state);
        
        if (toolResult.success && toolResult.action) {
          // Apply the action to the timeline
          switch (toolResult.action.type) {
            case 'ADD_ITEM':
              actions.addItem(toolResult.action.payload);
              break;
            case 'ADD_TRANSITION':
              actions.addTransition(toolResult.action.payload);
              break;
            case 'UPDATE_ITEM':
              actions.updateItem(toolResult.action.payload.itemId, toolResult.action.payload.updates);
              break;
            case 'REMOVE_ITEM':
              actions.removeItem(toolResult.action.payload.itemId);
              break;
            case 'ADD_TRACK':
              actions.addTrack();
              break;
          }
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: toolResult.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else if (result.action === 'textResponse') {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-white">AI Timeline Editor</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-600">
          {!session?.access_token ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-2">Please sign in to use AI chat</p>
              <div className="text-xs text-gray-500">Authentication required for AI features</div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Tell me what you want to do with your timeline..."
                className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          )}
        </form>

        {/* Timeline Summary */}
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
            {getTimelineSummary(state)}
          </div>
        </div>
      </div>
    </div>
  );
}