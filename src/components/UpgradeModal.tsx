'use client';

import React, { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '../lib/supabase/client';
import { STRIPE_CONFIG } from '../lib/stripe-config';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import PaymentConfirmationModal from './PaymentConfirmationModal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
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

export default function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState('');
  const [validatedPromo, setValidatedPromo] = useState<any>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
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

      // The API returns payment methods as a direct array, not wrapped in paymentMethods property
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

  const plans = [
    {
      name: 'Creator',
      tier: 'creator',
      price: STRIPE_CONFIG.tiers.creator.price,
      annualPrice: STRIPE_CONFIG.tiers.creator.annual_price,
      credits: STRIPE_CONFIG.tiers.creator.credits,
      features: ['1,000 credits/month', 'No watermarks', '1080p exports', 'Priority support']
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: STRIPE_CONFIG.tiers.pro.price,
      annualPrice: STRIPE_CONFIG.tiers.pro.annual_price,
      credits: STRIPE_CONFIG.tiers.pro.credits,
      features: ['5,000 credits/month', '4K exports', 'Team collaboration', 'Advanced features']
    }
  ];

  const creditPackages = Object.entries(STRIPE_CONFIG.topups).map(([amount, config]) => ({
    amount: Number(amount),
    price: config.price,
    priceId: config.priceId
  }));

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

      // First, get payment preview
      const previewResponse = await fetch('/api/stripe/payment-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planTier,
          billingPeriod,
          promotionCode: validatedPromo ? promoCode : undefined
        })
      });

      const previewData = await previewResponse.json();
      
      if (previewData.error) {
        if (previewData.error.includes('No payment method')) {
          // Fallback to checkout flow
          const checkoutResponse = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              planTier,
              billingPeriod,
              mode: 'subscription',
              promotionCode: validatedPromo ? promoCode : undefined
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

      // Set up confirmation modal
      const plan = plans.find(p => p.tier === planTier);
      const displayPrice = billingPeriod === 'annual' ? plan?.annualPrice : plan?.price;
      
      setPendingPayment({
        type: 'subscription',
        paymentInfo: previewData.paymentInfo,
        amount: displayPrice,
        planName: plan?.name,
        credits: plan?.credits,
        cardLast4: userData.paymentMethod?.last4,
        cardBrand: userData.paymentMethod?.brand,
        billingPeriod,
        promotionCode: validatedPromo ? promoCode : undefined,
        discount: previewData.paymentInfo?.discount || (validatedPromo ? {
          percent_off: validatedPromo.percent_off,
          amount_off: validatedPromo.amount_off,
          promoCode: promoCode
        } : undefined)
      });
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyCredits = async (amount: number) => {
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

      // First, get payment preview
      const previewResponse = await fetch('/api/stripe/payment-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          creditsAmount: amount,
          promotionCode: validatedPromo ? promoCode : undefined
        })
      });

      const previewData = await previewResponse.json();
      
      if (previewData.error) {
        if (previewData.error.includes('No payment method')) {
          // Fallback to checkout flow
          const checkoutResponse = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              creditsAmount: amount,
              mode: 'payment',
              promotionCode: validatedPromo ? promoCode : undefined
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

      // Set up confirmation modal
      const pkg = creditPackages.find(p => p.amount === amount);
      
      setPendingPayment({
        type: 'credits',
        paymentInfo: previewData.paymentInfo,
        amount: pkg?.price,
        credits: amount,
        cardLast4: userData.paymentMethod?.last4,
        cardBrand: userData.paymentMethod?.brand,
        promotionCode: validatedPromo ? promoCode : undefined,
        discount: previewData.paymentInfo?.discount || (validatedPromo ? {
          percent_off: validatedPromo.percent_off,
          amount_off: validatedPromo.amount_off,
          promoCode: promoCode
        } : undefined)
      });
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error buying credits:', error);
      alert('Failed to purchase credits. Please try again.');
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
        const errorData = await response.json();
        console.error('Error from API:', errorData);
        alert('Error setting up payment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating setup intent:', error);
      alert('Error setting up payment. Please try again.');
    }
  };

  const handlePaymentMethodAdded = async () => {
    console.log('Payment method added, refreshing user data...');
    setShowAddPaymentModal(false);
    setSetupClientSecret(null);
    // Refresh user data to update hasPaymentMethod and card info
    await fetchUserData();
    console.log('User data refreshed after adding payment method');
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

      // Process the payment
      const paymentResponse = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paymentInfo: {
            ...pendingPayment.paymentInfo,
            promotionCode: pendingPayment.promotionCode
          }
        })
      });

      const paymentData = await paymentResponse.json();
      
      if (paymentData.success) {
        // Payment succeeded, refresh user data and close modals
        await fetchUserData();
        setShowConfirmationModal(false);
        setPendingPayment(null);
        onSuccess?.({
          type: pendingPayment.type,
          ...(pendingPayment.type === 'subscription' ? {
            planTier: pendingPayment.paymentInfo?.planTier,
            billingPeriod: pendingPayment.billingPeriod
          } : {
            amount: pendingPayment.credits
          })
        });
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

  const refreshCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/user/credits', { headers });
      const data = await response.json();
      
      if (userData) {
        setUserData({
          ...userData,
          credits: {
            total: data.total_credits || 0,
            used: data.used_credits || 0,
            remaining: Math.max(0, (data.total_credits || 0) - (data.used_credits || 0))
          }
        });
      }
    } catch (error) {
      console.error('Error refreshing credits:', error);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }

    setPromoCodeError('');
    try {
      const response = await fetch('/api/stripe/validate-promo-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setPromoCodeError(data.error || 'Invalid promo code');
        setValidatedPromo(null);
        return;
      }

      setValidatedPromo(data);
      setPromoCodeError('');
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoCodeError('Failed to validate promo code');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-gray-600 mt-1">Get more credits and unlock powerful features</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="p-6">
              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Current Plan: {userData?.subscription.plan}</h3>
                    <p className="text-gray-600">
                      {userData?.credits.remaining} of {userData?.credits.total} credits remaining
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${userData?.credits.total ? (userData.credits.remaining / userData.credits.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Credit Usage</p>
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="mb-6">
                {!showPromoInput ? (
                  <button
                    onClick={() => setShowPromoInput(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Have a promo code?
                  </button>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <h4 className="font-medium text-gray-900">Enter Promo Code</h4>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoCodeError('');
                          setValidatedPromo(null);
                        }}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={validatePromoCode}
                        disabled={!promoCode.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setShowPromoInput(false);
                          setPromoCode('');
                          setPromoCodeError('');
                          setValidatedPromo(null);
                        }}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                    {promoCodeError && (
                      <p className="text-sm text-red-600 mt-2">{promoCodeError}</p>
                    )}
                    {validatedPromo && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>
                          Promo applied: {validatedPromo.percent_off ? `${validatedPromo.percent_off}% off` : `$${validatedPromo.amount_off / 100} off`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subscription Plans */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Subscription Plans</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        billingPeriod === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors relative ${
                        billingPeriod === 'annual'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Annual
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
                        Save 20%
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => {
                    const isCurrentPlan = plan.tier === userData?.subscription.tier;
                    const displayPrice = billingPeriod === 'annual' ? plan.annualPrice : plan.price;
                    const savings = billingPeriod === 'annual' ? 
                      Math.round(((plan.price - plan.annualPrice!) / plan.price) * 100) : 0;

                    return (
                      <div
                        key={plan.tier}
                        className={`border rounded-lg p-6 relative ${
                          isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        } ${plan.tier === 'pro' ? 'ring-2 ring-blue-500 ring-opacity-30' : ''}`}
                      >
                        {plan.tier === 'pro' && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 text-white px-3 py-1 text-xs rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        
                        <h4 className="font-semibold text-lg text-gray-900">{plan.name}</h4>
                        <div className="mt-2">
                          <div className="flex items-baseline">
                            <p className="text-3xl font-bold text-gray-900">${displayPrice}</p>
                            <span className="text-sm text-gray-600 ml-1">/month</span>
                          </div>
                          {savings > 0 && (
                            <p className="text-sm text-green-600">Save {savings}% annually</p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.credits.toLocaleString()} credits/month
                          </p>
                        </div>
                        
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                            className={`w-full mt-6 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
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
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h6zM4 14a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2z" />
                                  </svg>
                                )}
                                <span>
                                  {!userData?.hasPaymentMethod 
                                    ? `Add Card & Upgrade to ${plan.name}`
                                    : `Buy ${plan.name} Plan`
                                  }
                                </span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {isCurrentPlan && (
                          <div className="w-full mt-6 px-4 py-2 bg-green-100 text-green-800 text-center rounded-lg font-medium">
                            Current Plan
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Credit Top-ups */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buy Additional Credits</h3>
                <p className="text-gray-600 mb-4">Need more credits this month? Purchase additional credits that never expire.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {creditPackages.map((pkg) => (
                    <button
                      key={pkg.amount}
                      onClick={() => handleBuyCredits(pkg.amount)}
                      disabled={processing}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{pkg.amount}</div>
                        <div className="text-sm text-gray-600 mb-2">credits</div>
                        <div className="text-sm font-semibold text-blue-600">${pkg.price}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          {userData?.hasPaymentMethod ? 'Buy Now' : 'Add Card First'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
    </>
  );
}