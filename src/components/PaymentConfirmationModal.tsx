'use client';

import React, { useState } from 'react';
import { X, Loader2, CreditCard, Calendar, Zap } from 'lucide-react';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  paymentInfo: {
    type: 'subscription' | 'credits';
    amount: number;
    planName?: string;
    credits?: number;
    cardLast4?: string;
    cardBrand?: string;
    billingPeriod?: 'monthly' | 'annual';
    discount?: {
      percent_off?: number;
      amount_off?: number;
      promoCode?: string;
    };
  };
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  paymentInfo,
}: PaymentConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Payment confirmation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateDiscountedAmount = () => {
    const originalAmount = paymentInfo.amount;
    const discount = paymentInfo.discount;

    if (!discount) return originalAmount;

    if (discount.percent_off) {
      return originalAmount * (1 - discount.percent_off / 100);
    } else if (discount.amount_off) {
      return Math.max(0, originalAmount - (discount.amount_off / 100)); // amount_off is in cents
    }

    return originalAmount;
  };

  const discountedAmount = calculateDiscountedAmount();
  const originalAmount = paymentInfo.amount;
  const hasDiscount = paymentInfo.discount && discountedAmount !== originalAmount;

  const getNextBillingDate = () => {
    const now = new Date();
    if (paymentInfo.billingPeriod === 'annual') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Confirm Payment</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {paymentInfo.type === 'subscription' ? (
                <Package className="w-5 h-5 text-blue-600" />
              ) : (
                <Zap className="w-5 h-5 text-yellow-600" />
              )}
              <h3 className="font-medium">
                {paymentInfo.type === 'subscription' 
                  ? `${paymentInfo.planName} Plan` 
                  : 'Credit Top-up'
                }
              </h3>
            </div>
            
            <div className="space-y-2 text-sm">
              {hasDiscount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-500 line-through">{formatAmount(originalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({paymentInfo.discount?.promoCode}):</span>
                    <span>
                      {paymentInfo.discount?.percent_off ? `-${paymentInfo.discount.percent_off}%` : 
                       `-${formatAmount((paymentInfo.discount?.amount_off || 0) / 100)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-green-600">{formatAmount(discountedAmount)}</span>
                  </div>
                </>
              )}
              
              {!hasDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">{formatAmount(paymentInfo.amount)}</span>
                </div>
              )}
              
              {paymentInfo.type === 'subscription' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credits per month:</span>
                    <span className="font-semibold">{paymentInfo.credits?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billing:</span>
                    <span className="font-semibold capitalize">{paymentInfo.billingPeriod}</span>
                  </div>
                </>
              )}
              
              {paymentInfo.type === 'credits' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits to add:</span>
                  <span className="font-semibold">{paymentInfo.credits?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">
                {paymentInfo.cardBrand} ending in {paymentInfo.cardLast4}
              </p>
              <p className="text-sm text-gray-500">Default payment method</p>
            </div>
          </div>

          {/* Billing Information */}
          {paymentInfo.type === 'subscription' && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Credits reset monthly
                </p>
                <p className="text-sm text-blue-700">
                  Next billing: {getNextBillingDate()}
                </p>
              </div>
            </div>
          )}

          {paymentInfo.type === 'credits' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> These credits will be added to your account immediately and don't expire.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Confirm ${formatAmount(discountedAmount)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Missing Package import, let me add it
function Package({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}