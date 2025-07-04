'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2 } from 'lucide-react';
import { createClientSupabaseClient } from '../lib/supabase/client';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

function getStripe() {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

async function getAuthToken() {
  const supabase = createClientSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientSecret: string;
}

function PaymentForm({ clientSecret, onSuccess, onClose }: { clientSecret: string; onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm the setup intent with the card
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Failed to add payment method');
      } else if (setupIntent?.payment_method) {
        // The payment method was successfully created and attached
        // Stripe automatically attaches it to the customer via the setup intent
        onSuccess();
      } else {
        setError('Payment method setup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Payment setup error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                  iconColor: '#424770',
                },
                invalid: {
                  color: '#9e2146',
                  iconColor: '#9e2146',
                },
              },
              hidePostalCode: false,
            }}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Add Payment Method'
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AddPaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
  clientSecret,
}: AddPaymentMethodModalProps) {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      getStripe().then((stripe) => {
        setStripeInstance(stripe);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading payment form...</span>
          </div>
        ) : !stripeInstance ? (
          <div className="text-red-600 text-center py-8">
            Failed to load payment form. Please check your configuration.
          </div>
        ) : (
          <Elements stripe={stripeInstance}>
            <PaymentForm 
              clientSecret={clientSecret} 
              onSuccess={onSuccess} 
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}