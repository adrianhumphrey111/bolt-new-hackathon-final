'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PaywallModal } from '../../components/PaywallModal';

interface SubscriptionPageClientProps {
  user: any;
  profile: any;
}

export default function SubscriptionPageClient({ user, profile }: SubscriptionPageClientProps) {
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(true);

  // If user already has a subscription, redirect to dashboard
  useEffect(() => {
    if (profile?.subscription_tier && profile?.stripe_subscription_id) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  const handleClose = () => {
    // If user closes the paywall, redirect back to dashboard
    // The dashboard will handle the subscription check again
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg">
            Unlock the full power of our video editing platform
          </p>
        </div>

        {/* User Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-white font-semibold">{user.email}</h2>
              <p className="text-gray-400 text-sm">
                Current plan: {profile?.subscription_tier || 'Free'}
              </p>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">AI Video Analysis</h3>
            <p className="text-gray-400 text-sm">
              Automatically analyze your videos with advanced AI to identify scenes, topics, and key moments.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Timeline Generation</h3>
            <p className="text-gray-400 text-sm">
              Create professional timelines automatically based on your content and storyboard.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">High-Quality Exports</h3>
            <p className="text-gray-400 text-sm">
              Export your videos in up to 4K resolution without watermarks for professional results.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <button
            onClick={() => setShowPaywall(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Choose Your Plan
          </button>
          <p className="text-gray-400 text-sm mt-4">
            30-day money-back guarantee • Cancel anytime
          </p>
        </div>
      </div>

      {/* PaywallModal for subscription selection */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={handleClose}
        requiredCredits={100} // Placeholder - this will show subscription options
        availableCredits={0}
        action="access premium features"
      />
    </div>
  );
}