'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { FaCreditCard, FaLock, FaCheck } from 'react-icons/fa';

interface PaymentFormProps {
  clientSecret: string;
  billingFrequency: 'monthly' | 'annual';
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function PaymentForm({ clientSecret, billingFrequency, onSuccess, onError, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm setup intent (for trial - no immediate charge)
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?trial_started=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment setup failed');
        return;
      }

      // Create subscription after successful setup
      console.log('Creating subscription with setup intent:', setupIntent.id);
      
      const subscriptionResponse = await fetch('/api/stripe/create-trial-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setupIntentId: setupIntent.id,
          billingFrequency: billingFrequency,
        }),
      });

      console.log('Subscription response status:', subscriptionResponse.status);
      const subscriptionData = await subscriptionResponse.json();
      console.log('Subscription response data:', subscriptionData);

      if (subscriptionData.error) {
        console.error('Subscription creation error:', subscriptionData.error);
        onError(subscriptionData.error);
      } else {
        console.log('Subscription created successfully:', subscriptionData);
        onSuccess();
      }
    } catch (err) {
      onError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Payment Details</h3>
        <p className="text-gray-400">Enter your payment information to start your trial</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <PaymentElement
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  email: '',
                },
              },
            }}
          />
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-center space-x-3">
            <FaCheck className="w-4 h-4 text-green-400" />
            <span>7-day free trial - no charges until trial ends</span>
          </div>
          <div className="flex items-center space-x-3">
            <FaCheck className="w-4 h-4 text-green-400" />
            <span>Cancel anytime during trial</span>
          </div>
          <div className="flex items-center space-x-3">
            <FaLock className="w-4 h-4 text-green-400" />
            <span>Secure payment processing</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-medium transition-colors"
          >
            Back
          </button>
          
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
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
        </div>
      </form>
    </div>
  );
}