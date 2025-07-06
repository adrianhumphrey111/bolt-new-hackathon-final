'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiX, FiHardDrive, FiArrowRight, FiCreditCard } from 'react-icons/fi';
import { createClientSupabaseClient } from '../lib/supabase/client';
import { STRIPE_CONFIG } from '../lib/stripe-config';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import PaymentConfirmationModal from './PaymentConfirmationModal';

interface StoragePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStorageGB: number;
  storageLimit: number;
  fileSize: number; // in bytes
  onSuccess?: () => void;
}

interface UserData {
  subscription: {
    tier: string;
    plan: string;
    status: string;
  };
  credits: {
    total: number;
    used: number;
    remaining: number;
  };
  hasPaymentMethod: boolean;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
}

export function StoragePaywallModal({
  isOpen,
  onClose,
  currentStorageGB,
  storageLimit,
  fileSize,
  onSuccess
}: StoragePaywallModalProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch user credits
      const creditsResponse = await fetch('/api/user/credits', { headers });
      const creditsData = await creditsResponse.json();

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', session?.user?.id)
        .single();

      // Check if user has payment methods
      const paymentResponse = await fetch('/api/user/payment-methods', { headers });
      const paymentData = await paymentResponse.json();

      const paymentMethods = Array.isArray(paymentData) ? paymentData : [];
      const hasPaymentMethod = paymentMethods.length > 0;
      const defaultPaymentMethod = hasPaymentMethod ? paymentMethods[0] : null;

      setUserData({
        subscription: {
          tier: profile?.subscription_tier || 'free',
          plan: profile?.subscription_tier === 'free' ? 'Free' : 
                profile?.subscription_tier === 'creator' ? 'Creator' : 'Pro',
          status: profile?.subscription_status || 'active'
        },
        credits: {
          total: creditsData.total_credits || 0,
          used: creditsData.used_credits || 0,
          remaining: Math.max(0, (creditsData.total_credits || 0) - (creditsData.used_credits || 0))
        },
        hasPaymentMethod,
        paymentMethod: defaultPaymentMethod ? {
          brand: defaultPaymentMethod.brand || defaultPaymentMethod.card?.brand || 'Card',
          last4: defaultPaymentMethod.last4 || defaultPaymentMethod.card?.last4 || '****'
        } : undefined
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planTier: string) => {
    if (!userData?.hasPaymentMethod) {
      await handleAddPaymentMethod();
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Get payment preview
      const previewResponse = await fetch('/api/stripe/payment-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planTier,
          billingPeriod: 'monthly'
        })
      });

      const previewData = await previewResponse.json();
      
      if (previewData.error) {
        if (previewData.error.includes('No payment method')) {
          const checkoutResponse = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              planTier,
              billingPeriod: 'monthly',
              mode: 'subscription'
            })
          });
          const checkoutData = await checkoutResponse.json();
          if (checkoutData.checkoutUrl) {
            window.location.href = checkoutData.checkoutUrl;
          }
          return;
        }
        throw new Error(previewData.error);
      }

      const plan = plans.find(p => p.tier === planTier);
      
      setPendingPayment({
        type: 'subscription',
        paymentInfo: previewData.paymentInfo,
        amount: plan?.price,
        planName: plan?.name,
        credits: plan?.credits,
        cardLast4: userData.paymentMethod?.last4,
        cardBrand: userData.paymentMethod?.brand,
        billingPeriod: 'monthly'
      });
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers
      });

      if (response.ok) {
        const { clientSecret } = await response.json();
        setSetupClientSecret(clientSecret);
        setShowAddPaymentModal(true);
      } else {
        alert('Error setting up payment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating setup intent:', error);
      alert('Error setting up payment. Please try again.');
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPaymentModal(false);
    setSetupClientSecret(null);
    await fetchUserData();
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const paymentResponse = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentInfo: pendingPayment.paymentInfo
        })
      });

      const paymentData = await paymentResponse.json();
      
      if (paymentData.success) {
        await fetchUserData();
        setShowConfirmationModal(false);
        setPendingPayment(null);
        onSuccess?.();
        onClose();
      } else {
        throw new Error(paymentData.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const plans = [
    {
      name: 'Creator',
      tier: 'creator',
      price: STRIPE_CONFIG.tiers.creator.price,
      credits: STRIPE_CONFIG.tiers.creator.credits,
      storage: '10 GB',
      features: ['1,000 credits/month', '10 GB storage', 'No watermarks', '1080p exports']
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: STRIPE_CONFIG.tiers.pro.price,
      credits: STRIPE_CONFIG.tiers.pro.credits,
      storage: '50 GB',
      features: ['5,000 credits/month', '50 GB storage', '4K exports', 'Team collaboration']
    }
  ];

  if (!isOpen) return null;

  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  const totalAfterUpload = currentStorageGB + fileSizeGB;

  const handleShowPlans = () => {
    setProcessing(true);
    // Simulate loading state
    setTimeout(() => {
      setShowPlans(true);
      setProcessing(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FiHardDrive className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Storage Limit Reached</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              Your upload would exceed your storage limit:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current storage:</span>
                <span className="font-medium">{currentStorageGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File size:</span>
                <span className="font-medium">{fileSizeGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total after upload:</span>
                <span className="font-bold text-orange-600">{totalAfterUpload.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your limit:</span>
                <span className="font-medium">{storageLimit} GB</span>
              </div>
            </div>
          </div>

          {!showPlans ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Upgrade for More Storage</h3>
              <ul className="text-sm text-blue-800 space-y-1 mb-3">
                <li>• Get up to 50 GB storage (25x more space)</li>
                <li>• Monthly credits included</li>
                <li>• Priority support</li>
                <li>• Advanced features</li>
              </ul>
              <p className="text-sm text-blue-700">
                Choose from <span className="font-medium">Creator ($15/month)</span> or <span className="font-medium">Pro ($100/month)</span> plans
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Choose Your Plan</h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => {
                    const isCurrentPlan = plan.tier === userData?.subscription.tier;
                    
                    return (
                      <div
                        key={plan.tier}
                        className={`border rounded-lg p-4 relative ${
                          isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        } ${plan.tier === 'pro' ? 'ring-2 ring-blue-500 ring-opacity-30' : ''}`}
                      >
                        {plan.tier === 'pro' && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 text-white px-2 py-1 text-xs rounded-full">
                              Recommended
                            </span>
                          </div>
                        )}
                        
                        <h4 className="font-semibold text-lg text-gray-900">{plan.name}</h4>
                        <div className="mt-2">
                          <div className="flex items-baseline">
                            <p className="text-2xl font-bold text-gray-900">${plan.price}</p>
                            <span className="text-sm text-gray-600 ml-1">/month</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.credits.toLocaleString()} credits • {plan.storage} storage
                          </p>
                        </div>
                        
                        <ul className="mt-3 space-y-1">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <svg className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {!isCurrentPlan && (
                          <button
                            onClick={() => handleUpgrade(plan.tier)}
                            disabled={processing}
                            className={`w-full mt-4 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                              plan.tier === 'pro'
                                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                                : 'border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-400 disabled:text-blue-400'
                            } ${processing ? 'cursor-not-allowed' : ''}`}
                          >
                            {processing ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                {!userData?.hasPaymentMethod && (
                                  <FiCreditCard className="w-4 h-4" />
                                )}
                                <span>
                                  {!userData?.hasPaymentMethod 
                                    ? `Add Card & Upgrade`
                                    : `Upgrade to ${plan.name}`
                                  }
                                </span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {isCurrentPlan && (
                          <div className="w-full mt-4 px-3 py-2 bg-green-100 text-green-800 text-center rounded-lg font-medium text-sm">
                            Current Plan
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!showPlans ? (
              <button
                onClick={handleShowPlans}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    View Plans
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowPlans(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Add Payment Method Modal */}
      {showAddPaymentModal && setupClientSecret && (
        <AddPaymentMethodModal
          isOpen={showAddPaymentModal}
          onClose={() => {
            setShowAddPaymentModal(false);
            setSetupClientSecret(null);
          }}
          onSuccess={handlePaymentMethodAdded}
          clientSecret={setupClientSecret}
        />
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmationModal && pendingPayment && (
        <PaymentConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setPendingPayment(null);
          }}
          onConfirm={handleConfirmPayment}
          paymentInfo={pendingPayment}
        />
      )}
    </div>
  );
}