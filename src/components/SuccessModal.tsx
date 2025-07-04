'use client';

import React from 'react';
import { X, CheckCircle, Calendar, CreditCard } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'info';
  details?: {
    planName?: string;
    credits?: number;
    nextAction?: string;
  };
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'success',
  details,
}: SuccessModalProps) {
  if (!isOpen) return null;

  const icon = type === 'success' ? CheckCircle : Calendar;
  const iconColor = type === 'success' ? 'text-green-600' : 'text-blue-600';
  const bgColor = type === 'success' ? 'bg-green-50' : 'bg-blue-50';
  const borderColor = type === 'success' ? 'border-green-200' : 'border-blue-200';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {React.createElement(icon, {
              className: `w-6 h-6 ${iconColor}`
            })}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>

          {details && (
            <div className={`${bgColor} ${borderColor} border rounded-lg p-4`}>
              <div className="space-y-2 text-sm">
                {details.planName && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-600" />
                    <span>Current plan: <strong>{details.planName}</strong></span>
                  </div>
                )}
                {details.credits && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-center">💳</span>
                    <span>Available credits: <strong>{details.credits.toLocaleString()}</strong></span>
                  </div>
                )}
                {details.nextAction && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span>{details.nextAction}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}