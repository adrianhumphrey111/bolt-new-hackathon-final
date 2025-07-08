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
    { icon: <FaBolt className="w-5 h-5" />, text: "500 AI actions per month", highlight: true },
    { icon: <FaVideo className="w-5 h-5" />, text: "150 minutes of AI video generation", highlight: true },
    { icon: <FaRocket className="w-5 h-5" />, text: "4K exports without watermarks" },
    { icon: <FaStar className="w-5 h-5" />, text: "Advanced motion graphics & effects" },
    { icon: <FaLock className="w-5 h-5" />, text: "Priority processing & support" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl animate-pulse"></div>
        
        <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-800 overflow-hidden">
          {/* Header with countdown */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
            <div className="relative p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 animate-bounce">
                <FaVideo className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Start Your 7-Day Pro Trial
              </h2>
              
              <p className="text-xl text-gray-300 mb-6">
                Experience the full power of AI video editing
              </p>

              {/* Countdown timer */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-3xl font-bold text-white">{days}</div>
                  <div className="text-xs text-gray-400 uppercase">Days</div>
                </div>
                <div className="text-2xl text-gray-600">:</div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-3xl font-bold text-white">{hours}</div>
                  <div className="text-xs text-gray-400 uppercase">Hours</div>
                </div>
                <div className="text-2xl text-gray-600">:</div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-3xl font-bold text-white">{minutes}</div>
                  <div className="text-xs text-gray-400 uppercase">Minutes</div>
                </div>
              </div>

              <div className="inline-flex items-center space-x-2 text-green-400 text-sm">
                <FaClock className="w-4 h-4" />
                <span>Limited time offer - No commitment required</span>
              </div>
            </div>
          </div>

          {/* Features grid */}
          <div className="px-8 pb-6">
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
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
                  <span className="text-white font-medium">{feature.text}</span>
                  <FaCheck className={`w-4 h-4 ml-auto ${
                    feature.highlight ? 'text-blue-400' : 'text-green-400'
                  }`} />
                </div>
              ))}
            </div>
          </div>

          {/* Pricing info */}
          <div className="px-8 pb-8">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">After trial ends:</div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white">$49</span>
                    <span className="text-gray-400">/month</span>
                    <span className="text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      Save $51 vs competitors
                    </span>
                  </div>
                </div>
                <FaLock className="w-12 h-12 text-blue-400/20" />
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <FaCheck className="w-3 h-3 text-green-400" />
                  <span>Cancel anytime during trial - no charges</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaCheck className="w-3 h-3 text-green-400" />
                  <span>Secure payment via Stripe</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaCheck className="w-3 h-3 text-green-400" />
                  <span>Instant access to all Pro features</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={handleStartTrial}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Setting up trial...</span>
                </>
              ) : (
                <>
                  <FaCreditCard className="w-5 h-5" />
                  <span>Start Free 7-Day Trial</span>
                </>
              )}
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="w-full text-gray-400 hover:text-white py-2 transition-colors"
              >
                Maybe later
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="border-t border-gray-800 px-8 py-4 bg-gray-900/50">
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <FaLock className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Powered by</span>
                <span className="font-semibold text-white">Stripe</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Trusted by</span>
                <span className="font-semibold text-white">10,000+</span>
                <span>creators</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}