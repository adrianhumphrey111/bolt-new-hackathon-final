'use client';

import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, Calendar, CreditCard } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cancelImmediately: boolean) => Promise<void>;
  subscriptionInfo: {
    planName: string;
    nextBillingDate?: string;
    remainingCredits: number;
  };
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  subscriptionInfo,
}: CancelSubscriptionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelationType, setCancelationType] = useState<'end_of_period' | 'immediate'>('end_of_period');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(cancelationType === 'immediate');
    } catch (error) {
      console.error('Cancellation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold">Cancel Subscription</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700">
            You're about to cancel your <strong>{subscriptionInfo.planName}</strong> subscription.
          </p>

          {/* Cancellation Options */}
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="cancellation"
                  value="end_of_period"
                  checked={cancelationType === 'end_of_period'}
                  onChange={(e) => setCancelationType(e.target.value as 'end_of_period')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Cancel at period end</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>• Keep access until {subscriptionInfo.nextBillingDate || 'your next billing date'}</p>
                    <p>• Use your remaining {subscriptionInfo.remainingCredits.toLocaleString()} credits</p>
                    <p>• No refund, but you get full value for what you paid</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="border rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="cancellation"
                  value="immediate"
                  checked={cancelationType === 'immediate'}
                  onChange={(e) => setCancelationType(e.target.value as 'immediate')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">Cancel immediately</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>• Lose access immediately</p>
                    <p>• Move to Free plan (100 credits/month)</p>
                    <p>• Prorated refund for unused time</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Before you cancel:</p>
                <p>Consider if you might need video creation services again soon. You can always reactivate your subscription later.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Keep Subscription
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}