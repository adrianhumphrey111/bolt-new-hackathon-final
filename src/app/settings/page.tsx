'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../components/AuthProvider';
import { createClientSupabaseClient } from '../../lib/supabase/client';
import AddPaymentMethodModal from '../../components/AddPaymentMethodModal';
import PaymentConfirmationModal from '../../components/PaymentConfirmationModal';
import CancelSubscriptionModal from '../../components/CancelSubscriptionModal';
import SuccessModal from '../../components/SuccessModal';
import { STRIPE_CONFIG } from '../../lib/stripe-config';
import { 
  User, 
  CreditCard, 
  Package, 
  BarChart3, 
  Settings,
  ChevronRight,
  Loader2,
  ArrowLeft
} from 'lucide-react';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'subscription', label: 'Subscription', icon: Package },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
];

export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-12 min-h-[600px]">
            {/* Sidebar Navigation */}
            <div className="col-span-3 border-r border-gray-200">
              <nav className="p-4 space-y-1">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{section.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-opacity ${
                        activeSection === section.id ? 'opacity-100' : 'opacity-0'
                      }`} />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="col-span-9 p-8">
              {activeSection === 'profile' && <ProfileSection />}
              {activeSection === 'payment' && <PaymentSection />}
              {activeSection === 'subscription' && <SubscriptionSection />}
              {activeSection === 'usage' && <UsageSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuthContext();
  const supabase = createClientSupabaseClient();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    email: user?.email || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Update Supabase user metadata
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: formData.name,
            name: formData.name,
          }
        });
        
        if (!error) {
          setIsEditing(false);
        } else {
          console.error('Failed to update user metadata:', error);
        }
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
        </div>

        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentSection() {
  const supabase = createClientSupabaseClient();
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchPaymentMethods = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/payment-methods', { headers });
      if (response.ok) {
        const methods = await response.json();
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      const headers = await getAuthHeaders();
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
        alert('Error creating payment setup. Please try again.');
      }
    } catch (error) {
      console.error('Error creating setup intent:', error);
      alert('Error creating payment setup. Please try again.');
    }
  };

  const handleRemovePayment = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/user/payment-methods', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ paymentMethodId: id }),
      });

      if (response.ok) {
        setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // In a real implementation, this would call Stripe API
      setPaymentMethods(paymentMethods.map(pm => ({
        ...pm,
        isDefault: pm.id === id
      })));
    } catch (error) {
      console.error('Error setting default payment method:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setShowAddPaymentModal(false);
    setSetupClientSecret(null);
    fetchPaymentMethods(); // Refresh the payment methods list
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Payment Methods</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {paymentMethods.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No payment methods added yet</p>
          ) : (
            paymentMethods.map((method) => (
              <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {method.card?.brand || method.brand} ending in {method.card?.last4 || method.last4}
                      </p>
                      {method.isDefault && (
                        <span className="text-sm text-green-600">Default</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => handleRemovePayment(method.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <button
        onClick={handleAddPayment}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Payment Method
      </button>

      {showAddPaymentModal && setupClientSecret && (
        <AddPaymentMethodModal
          isOpen={showAddPaymentModal}
          onClose={() => {
            setShowAddPaymentModal(false);
            setSetupClientSecret(null);
          }}
          onSuccess={handlePaymentSuccess}
          clientSecret={setupClientSecret}
        />
      )}
    </div>
  );
}

function SubscriptionSection() {
  const supabase = createClientSupabaseClient();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<any>(null);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState('');
  const [validatedPromo, setValidatedPromo] = useState<any>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [credits, setCredits] = useState({
    total: 0,
    used: 0,
    remaining: 0
  });
  const [subscription, setSubscription] = useState({
    plan: 'Free',
    tier: 'free',
    status: 'active',
    nextBilling: null as string | null
  });

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch user profile for subscription info
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user?.id)
        .single();

      // Fetch credit info
      const { data: creditData } = await supabase
        .from('user_credits')
        .select('total_credits, used_credits')
        .eq('user_id', user?.id)
        .single();

      if (creditData) {
        setCredits({
          total: creditData.total_credits,
          used: creditData.used_credits,
          remaining: Math.max(0, creditData.total_credits - creditData.used_credits)
        });
      }

      if (profile) {
        console.log('🔍 Profile data:', profile);
        const planName = profile.subscription_tier === 'free' ? 'Free' : 
                        profile.subscription_tier === 'creator' ? 'Creator' : 'Pro';
        setSubscription({
          plan: planName,
          tier: profile.subscription_tier || 'free',
          status: profile.subscription_status || 'active',
          nextBilling: null // Would need to fetch from Stripe for paid users
        });
        console.log('🔍 Setting subscription to:', {
          plan: planName,
          tier: profile.subscription_tier || 'free'
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { 
      name: 'Free', 
      tier: 'free',
      price: 0, 
      credits: STRIPE_CONFIG.tiers.free.credits,
      features: STRIPE_CONFIG.tiers.free.features
    },
    { 
      name: 'Creator', 
      tier: 'creator',
      price: STRIPE_CONFIG.tiers.creator.price,
      annualPrice: STRIPE_CONFIG.tiers.creator.annual_price,
      credits: STRIPE_CONFIG.tiers.creator.credits,
      features: STRIPE_CONFIG.tiers.creator.features
    },
    { 
      name: 'Pro', 
      tier: 'pro',
      price: STRIPE_CONFIG.tiers.pro.price,
      annualPrice: STRIPE_CONFIG.tiers.pro.annual_price,
      credits: STRIPE_CONFIG.tiers.pro.credits,
      features: STRIPE_CONFIG.tiers.pro.features
    },
  ];

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

  const handleUpgrade = async (planTier: string, billingPeriod: 'monthly' | 'annual' = 'monthly') => {
    if (planTier === 'free') {
      return; // Already on free plan
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Get payment preview first
      const response = await fetch('/api/stripe/payment-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          planTier,
          billingPeriod,
          promotionCode: validatedPromo ? promoCode : undefined
        })
      });

      const { paymentInfo, error } = await response.json();
      if (error) {
        console.error('Payment preview error:', error);
        // If no payment method, redirect to checkout
        if (error.includes('No payment method')) {
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
          const { checkoutUrl } = await checkoutResponse.json();
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          }
        } else {
          alert('Failed to prepare payment. Please try again.');
        }
        return;
      }
      
      // Show confirmation modal with discount info
      const enhancedPaymentInfo = {
        ...paymentInfo,
        promotionCode: validatedPromo ? promoCode : undefined,
        discount: paymentInfo?.discount || (validatedPromo ? {
          percent_off: validatedPromo.percent_off,
          amount_off: validatedPromo.amount_off,
          promoCode: promoCode
        } : undefined)
      };
      setPendingPaymentInfo(enhancedPaymentInfo);
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error preparing payment:', error);
    }
  };

  const handleBuyCredits = async (creditsAmount: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Get payment preview first
      const response = await fetch('/api/stripe/payment-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          creditsAmount,
          promotionCode: validatedPromo ? promoCode : undefined
        })
      });

      const { paymentInfo, error } = await response.json();
      if (error) {
        console.error('Payment preview error:', error);
        // If no payment method, redirect to checkout
        if (error.includes('No payment method')) {
          const checkoutResponse = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
              creditsAmount,
              mode: 'payment',
              promotionCode: validatedPromo ? promoCode : undefined
            })
          });
          const { checkoutUrl } = await checkoutResponse.json();
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          }
        } else {
          alert('Failed to prepare payment. Please try again.');
        }
        return;
      }
      
      // Show confirmation modal with discount info
      const enhancedPaymentInfo = {
        ...paymentInfo,
        promotionCode: validatedPromo ? promoCode : undefined,
        discount: paymentInfo?.discount || (validatedPromo ? {
          percent_off: validatedPromo.percent_off,
          amount_off: validatedPromo.amount_off,
          promoCode: promoCode
        } : undefined)
      };
      setPendingPaymentInfo(enhancedPaymentInfo);
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error preparing payment:', error);
    }
  };

  const handleDowngrade = () => {
    setShowCancelModal(true);
  };

  const handleCancelSubscription = async (cancelImmediately: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          cancelImmediately
        })
      });

      const { success, message, error, cancelledImmediately, periodEndFormatted } = await response.json();
      
      if (success) {
        // Close cancel modal
        setShowCancelModal(false);
        
        // Show success modal
        setSuccessModalData({
          title: cancelledImmediately ? 'Subscription Cancelled' : 'Cancellation Scheduled',
          message: message,
          type: cancelledImmediately ? 'success' : 'info',
          details: {
            planName: cancelledImmediately ? 'Free' : subscription.plan,
            credits: cancelledImmediately ? 100 : credits.remaining,
            nextAction: cancelledImmediately ? 
              'You now have access to 100 credits per month on the Free plan.' :
              `Your subscription will end on ${periodEndFormatted || 'your next billing date'}.`
          }
        });
        setShowSuccessModal(true);
        
        // Refresh subscription data
        setTimeout(() => {
          fetchSubscriptionData();
        }, 1000);
      } else {
        console.error('Cancellation error:', error);
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  const handleConfirmPayment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          paymentInfo: pendingPaymentInfo
        })
      });

      const { success, message, error } = await response.json();
      
      if (success) {
        // Close modal
        setShowConfirmationModal(false);
        setPendingPaymentInfo(null);
        
        // Refresh subscription data with a small delay to ensure DB is updated
        setTimeout(() => {
          fetchSubscriptionData();
        }, 1000);
      } else {
        console.error('Payment processing error:', error);
        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Subscription & Credits</h2>
      
      {/* Current Plan & Credits */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-blue-900">{subscription.plan} Plan</h3>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Credits Remaining:</span>
                <span className="text-2xl font-bold text-blue-600">{credits.remaining}</span>
              </div>
              <div className="text-sm text-gray-500">
                {credits.used} of {credits.total} credits used
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(credits.used / credits.total) * 100}%` }}
                />
              </div>
            </div>
            {subscription.nextBilling && (
              <p className="text-sm text-blue-600 mt-4">
                Next billing date: {new Date(subscription.nextBilling).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full text-center">
              {subscription.status}
            </span>
            <div className="relative group">
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                Buy More Credits
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {Object.entries(STRIPE_CONFIG.topups).map(([amount, config]) => (
                  <button
                    key={amount}
                    onClick={() => handleBuyCredits(Number(amount))}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex justify-between">
                      <span>{amount} credits</span>
                      <span className="font-semibold">${config.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Usage Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
        <h4 className="font-medium text-gray-900 mb-2">Credit Usage:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Video Upload:</span>
            <span className="font-medium">{STRIPE_CONFIG.credits.costs.video_upload} credits</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">AI Timeline Generation:</span>
            <span className="font-medium">{STRIPE_CONFIG.credits.costs.ai_generate} credits</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">AI Chat:</span>
            <span className="font-medium">{STRIPE_CONFIG.credits.costs.ai_chat} credits</span>
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

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Available Plans</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 text-sm rounded-md transition-colors relative ${
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
      
      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentPlan = plan.tier === subscription.tier;
          const displayPrice = plan.tier === 'free' ? 0 : 
            billingPeriod === 'annual' ? plan.annualPrice : plan.price;
          const savings = plan.tier !== 'free' && billingPeriod === 'annual' ? 
            Math.round(((plan.price - plan.annualPrice!) / plan.price) * 100) : 0;

          return (
            <div
              key={plan.name}
              className={`border rounded-lg p-6 relative ${
                isCurrentPlan
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              } ${plan.tier === 'pro' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
            >
              {plan.tier === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 text-xs rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h4 className="font-semibold text-lg">{plan.name}</h4>
              <div className="mt-2">
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold">
                    {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
                  </p>
                  {displayPrice > 0 && (
                    <span className="text-sm text-gray-600 ml-1">
                      /{billingPeriod === 'annual' ? 'month' : 'month'}
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-sm text-green-600">Save {savings}% annually</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {typeof plan.credits === 'number' ? `${plan.credits.toLocaleString()} credits/month` : plan.credits}
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span> 
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {!isCurrentPlan && plan.tier !== 'free' && (
                <button 
                  onClick={() => handleUpgrade(plan.tier, billingPeriod)}
                  className={`w-full mt-4 px-4 py-2 rounded-lg transition-colors ${
                    plan.tier === 'pro'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {`Upgrade to ${plan.name}`}
                </button>
              )}
              {!isCurrentPlan && plan.tier === 'free' && subscription.tier !== 'free' && (
                <button 
                  onClick={() => handleDowngrade()}
                  className="w-full mt-4 px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  Downgrade to Free
                </button>
              )}
              {isCurrentPlan && (
                <div className="w-full mt-4 px-4 py-2 bg-green-100 text-green-800 text-center rounded-lg font-medium">
                  Current Plan
                </div>
              )}
            </div>
          );
        })}
      </div>

      {subscription.tier !== 'free' && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <button 
            onClick={() => setShowCancelModal(true)}
            className="text-red-600 hover:text-red-700 transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmationModal && pendingPaymentInfo && (
        <PaymentConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setPendingPaymentInfo(null);
          }}
          onConfirm={handleConfirmPayment}
          paymentInfo={pendingPaymentInfo}
        />
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          subscriptionInfo={{
            planName: subscription.plan,
            nextBillingDate: subscription.nextBilling || 'your next billing date',
            remainingCredits: credits.remaining
          }}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && successModalData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
          }}
          title={successModalData.title}
          message={successModalData.message}
          type={successModalData.type}
          details={successModalData.details}
        />
      )}
    </div>
  );
}

function UsageSection() {
  const supabase = createClientSupabaseClient();
  const [usage, setUsage] = useState({
    videosCreated: 0,
    videosLimit: 100,
    storageUsed: 0,
    storageLimit: 2,
    exportsThisMonth: 0,
    minutesRendered: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/user/usage', { headers });
      if (response.ok) {
        const usageData = await response.json();
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const usagePercentage = (usage.videosCreated / usage.videosLimit) * 100;
  const storagePercentage = (usage.storageUsed / usage.storageLimit) * 100;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Usage Statistics</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Videos Created</h3>
              <p className="text-3xl font-bold text-blue-600">{usage.videosCreated}</p>
              <p className="text-sm text-gray-600 mt-1">of {usage.videosLimit} this month</p>
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Storage Used</h3>
              <p className="text-3xl font-bold text-blue-600">{usage.storageUsed} GB</p>
              <p className="text-sm text-gray-600 mt-1">of {usage.storageLimit} GB total</p>
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Exports This Month</h3>
              <p className="text-3xl font-bold text-purple-600">{usage.exportsThisMonth}</p>
              <p className="text-sm text-gray-600 mt-1">videos exported</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Minutes Rendered</h3>
              <p className="text-3xl font-bold text-green-600">{usage.minutesRendered}</p>
              <p className="text-sm text-gray-600 mt-1">total minutes</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-4">Usage History</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-gray-500 text-center py-8">
                Detailed usage history chart will be displayed here
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}