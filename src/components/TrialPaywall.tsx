'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaBolt, FaRocket, FaStar, FaCheck, FaClock, FaLock, FaCreditCard } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';
import { useAuthContext } from './AuthProvider';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TrialPaywallProps {
  userEmail?: string;
  onClose?: () => void;
}

export default function TrialPaywall({ userEmail, onClose }: TrialPaywallProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annual'>('monthly');
  const router = useRouter();
  const { refreshAuth } = useAuthContext();

  // Initialize payment intent when component mounts
  useEffect(() => {
    if (userEmail) {
      initializePayment();
    }
  }, [userEmail]);

  const initializePayment = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stripe/create-trial-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          billingFrequency: billingFrequency,
        })
      });

      const data = await response.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error(data.error || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update billing frequency (payment intent doesn't need to change)
  const handleBillingFrequencyChange = (frequency: 'monthly' | 'annual') => {
    setBillingFrequency(frequency);
  };

  const handlePaymentSuccess = async (subscriptionData?: any) => {
    try {
      console.log('Trial completed successfully! User is already authenticated, redirecting to dashboard...');
      
      // Refresh auth context to get latest user data
      await refreshAuth();
      
      // Redirect to dashboard immediately since user is already logged in
      router.push('/dashboard?trial_started=true');
      
    } catch (error) {
      console.error('Error after trial completion:', error);
      // Still redirect to dashboard since user is authenticated
      router.push('/dashboard?trial_started=true');
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert('Payment failed. Please try again.');
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
      <div className="relative max-w-4xl w-full my-4 max-h-[95vh] overflow-y-auto">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl animate-pulse"></div>
        
        <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-800 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0 min-h-0">
            
            {/* Left Column - Features & Info */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/5 to-purple-600/5 p-6">
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

              {/* Features list */}
              <div className="space-y-2 mb-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 ${
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

            {/* Right Column - Payment Form */}
            <div className="p-6 flex flex-col justify-center">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Payment Details</h3>
                <p className="text-gray-400">Choose your billing frequency</p>
              </div>

              {/* Billing frequency selection */}
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={() => handleBillingFrequencyChange('monthly')}
                  className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                    billingFrequency === 'monthly'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">Monthly</div>
                    <div className="text-sm opacity-75">$49/month</div>
                  </div>
                </button>
                <button
                  onClick={() => handleBillingFrequencyChange('annual')}
                  className={`flex-1 p-4 rounded-xl border transition-all duration-200 relative ${
                    billingFrequency === 'annual'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">Annual</div>
                    <div className="text-sm opacity-75">$39/month</div>
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Save 20%
                    </div>
                  </div>
                </button>
              </div>


              {/* Payment Form */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-400">Loading payment form...</span>
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    billingFrequency={billingFrequency}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onCancel={onClose}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-400">Failed to load payment form. Please refresh and try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}