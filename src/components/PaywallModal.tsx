'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiX, FiZap, FiCreditCard } from 'react-icons/fi';
import { STRIPE_CONFIG } from '../lib/stripe-config';
import { createClientSupabaseClient } from '../lib/supabase/client';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  availableCredits: number;
  action: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  requiredCredits,
  availableCredits,
  action
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [actualCredits, setActualCredits] = useState<{
    total: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [fetchingCredits, setFetchingCredits] = useState(false);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  // Fetch actual user credits when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchCredits = async () => {
      setFetchingCredits(true);
      try {
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          setActualCredits(data);
        }
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setFetchingCredits(false);
      }
    };

    fetchCredits();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTopUp = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/stripe/topup-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creditsAmount: 100
        })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.success) {
        // Payment successful, refresh page
        window.location.reload();
      }
    } catch (error) {
      console.error('Error topping up credits:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const actionLabels: Record<string, string> = {
    video_upload: 'upload and analyze this video',
    ai_generate: 'generate AI timeline',
    ai_chat: 'use AI chat'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-600">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Insufficient Credits</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-gray-300">
            You need <span className="font-bold text-white">{requiredCredits} credits</span> to {actionLabels[action] || action}.
          </p>
          
          <div className="bg-gray-700 rounded p-3">
            <p className="text-sm text-gray-400">Your balance:</p>
            {fetchingCredits ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-400">Loading...</p>
              </div>
            ) : (
              <>
                <p className="text-lg font-bold text-white">
                  {actualCredits ? actualCredits.remaining : availableCredits} credits
                </p>
                <p className="text-sm text-red-400 mt-1">
                  {requiredCredits - (actualCredits ? actualCredits.remaining : availableCredits)} credits short
                </p>
              </>
            )}
          </div>

          <div className="bg-gray-700 rounded p-3">
            <p className="text-sm text-gray-400 mb-2">Credit costs:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-300">Video upload & analysis:</span>
                <span className="text-white font-medium">{STRIPE_CONFIG.credits.costs.video_upload} credits</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-300">AI timeline generation:</span>
                <span className="text-white font-medium">{STRIPE_CONFIG.credits.costs.ai_generate} credits</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-300">AI chat message:</span>
                <span className="text-white font-medium">{STRIPE_CONFIG.credits.costs.ai_chat} credits</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTopUp}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FiCreditCard className="w-4 h-4" />
            {loading ? 'Processing...' : 'Buy 100 credits for $10'}
          </button>
          
          <button
            onClick={() => router.push('/pricing')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}