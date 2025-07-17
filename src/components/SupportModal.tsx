"use client";

import React from 'react';
import { FaSlack, FaTimes, FaComments, FaUsers, FaRocket } from 'react-icons/fa';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null;

  const handleJoinSlack = () => {
    window.open('https://join.slack.com/t/tailored-labs-ai/shared_invite/zt-38hiu6813-iVu01NKpcN__8GjL4_j35w', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-700">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FaComments className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Get Help & Support</h2>
              <p className="text-gray-400 text-sm">Join our community on Slack</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Slack Card */}
          <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FaSlack className="w-8 h-8 text-[#4A154B]" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Tailored Labs AI Community</h3>
                  <p className="text-sm text-gray-400">Get instant help from our team and community</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-start space-x-2">
                <FaUsers className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <span className="font-medium">Active Community:</span> Get help from other users and our team
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <FaRocket className="w-4 h-4 text-purple-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <span className="font-medium">Quick Response:</span> Our team monitors Slack during business hours
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <FaComments className="w-4 h-4 text-green-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <span className="font-medium">Feature Requests:</span> Share ideas and vote on new features
                </div>
              </div>
            </div>

            <button
              onClick={handleJoinSlack}
              className="w-full bg-[#4A154B] hover:bg-[#611f69] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <FaSlack className="w-5 h-5" />
              <span>Join Slack Community</span>
            </button>
          </div>

          {/* Additional Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-400">Other Resources</h4>
            <div className="flex justify-center">
              <a
                href="mailto:adrian@tailoredlabsaiai.com"
                className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors text-sm text-gray-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Email Adrian Directly</span>
              </a>
            </div>
          </div>

          {/* What to Expect */}
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-2">What to expect in our Slack:</h4>
            <ul className="text-xs text-blue-200 space-y-1">
              <li>• Direct access to the founding team</li>
              <li>• Quick troubleshooting help</li>
              <li>• Early access to new features</li>
              <li>• Connect with other video creators</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Our team is most active Monday-Friday, 9am-6pm PST. For urgent issues, email adrian@tailoredlabsaiai.com
          </p>
        </div>
      </div>
    </div>
  );
}