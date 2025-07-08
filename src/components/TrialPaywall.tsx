'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaBolt, FaRocket, FaStar, FaCheck, FaClock, FaLock, FaCreditCard } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface TrialPaywallProps {
  userEmail?: string;
  onClose?: () => void;
}

export default function TrialPaywall({ userEmail, onClose }: TrialPaywallProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(7 * 24 * 60 * 60); // 7 days in seconds
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return { days, hours, minutes };
  };

  const { days, hours, minutes } = formatTime(timeLeft);

  const handleStartTrial = async () => {
    setIsLoading(true);
    
    try {
      // Create Stripe Checkout session for trial
      const response = await fetch('/api/stripe/create-trial-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          successUrl: `${window.location.origin}/dashboard?trial_started=true`,
          cancelUrl: `${window.location.origin}/auth/signup?trial_cancelled=true`
        })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Trial signup error:', error);
      alert('Failed to start trial. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: <FaBolt className="w-4 h-4" />, text: "500 AI actions per month", highlight: true },
    { icon: <FaVideo className="w-4 h-4" />, text: "150 minutes of AI video", highlight: true },
    { icon: <FaRocket className="w-4 h-4" />, text: "4K exports without watermarks" },
    { icon: <FaStar className="w-4 h-4" />, text: "Advanced motion graphics" },
    { icon: <FaLock className="w-4 h-4" />, text: "Priority processing & support" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative max-w-4xl w-full my-8">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl animate-pulse"></div>
        
        <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-800 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            
            {/* Left Column - Features & Info */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/5 to-purple-600/5 p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                  <FaVideo className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  7-Day Pro Trial
                </h2>
                
                <p className="text-lg text-gray-300">
                  Full access to all Pro features
                </p>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center justify-center space-x-2 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-2xl font-bold text-white">{days}</div>
                  <div className="text-xs text-gray-400 uppercase">Days</div>
                </div>
                <div className="text-xl text-gray-600">:</div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-2xl font-bold text-white">{hours}</div>
                  <div className="text-xs text-gray-400 uppercase">Hours</div>
                </div>
                <div className="text-xl text-gray-600">:</div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-2xl font-bold text-white">{minutes}</div>
                  <div className="text-xs text-gray-400 uppercase">Min</div>
                </div>
              </div>

              {/* Features list */}
              <div className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      feature.highlight 
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30' 
                        : 'bg-gray-800/30 border border-gray-700/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      feature.highlight ? 'bg-blue-600/20' : 'bg-gray-700/50'
                    }`}>
                      {feature.icon}
                    </div>
                    <span className="text-white text-sm font-medium">{feature.text}</span>
                    <FaCheck className={`w-3 h-3 ml-auto ${
                      feature.highlight ? 'text-blue-400' : 'text-green-400'
                    }`} />
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center space-x-2 text-green-400 text-sm">
                <FaClock className="w-4 h-4" />
                <span>Cancel anytime - no commitment</span>
              </div>
            </div>

            {/* Right Column - Payment CTA */}
            <div className="p-8 flex flex-col justify-center">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Start Your Trial</h3>
                <p className="text-gray-400">Enter your payment details to begin</p>
              </div>

              {/* Pricing info */}
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Free for 7 days, then:</div>
                  <div className="flex items-baseline justify-center space-x-2 mb-3">
                    <span className="text-3xl font-bold text-white">$49</span>
                    <span className="text-gray-400">/month</span>
                    <span className="text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      Save $51
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">vs competitors at $100/month</div>
                </div>
              </div>
              
              {/* Security badges */}
              <div className="space-y-3 text-sm text-gray-300 mb-6">
                <div className="flex items-center space-x-3">
                  <FaCheck className="w-4 h-4 text-green-400" />
                  <span>Cancel anytime during trial - no charges</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FaCheck className="w-4 h-4 text-green-400" />
                  <span>Secure payment processing via Stripe</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FaCheck className="w-4 h-4 text-green-400" />
                  <span>Instant access to all Pro features</span>
                </div>
              </div>

              {/* CTA button */}
              <button
                onClick={handleStartTrial}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 mb-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FaCreditCard className="w-5 h-5" />
                    <span>Start Free Trial</span>
                  </>
                )}
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full text-gray-400 hover:text-white py-2 transition-colors text-sm"
                >
                  Maybe later
                </button>
              )}

              {/* Trust indicators */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <FaLock className="w-3 h-3" />
                    <span>SSL Secure</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Powered by</span>
                    <span className="font-semibold text-white">Stripe</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>10,000+ creators</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}