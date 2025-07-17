'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaTimes, FaVideo, FaArrowRight, FaQuestionCircle, FaStar, FaBolt, FaCrown, FaRocket, FaPlay, FaUsers, FaShield } from 'react-icons/fa';
import { createClientSupabaseClient } from '../../lib/supabase/client';
import { STRIPE_CONFIG } from '../../lib/stripe-config';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClientSupabaseClient();

  const handleSubscribe = async (plan: string, priceId: string) => {
    setLoading(plan);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to auth with plan info
        window.location.href = `/auth/signup?plan=${plan}&priceId=${priceId}`;
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?subscription_success=true`,
          cancelUrl: `${window.location.origin}/pricing`
        })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleAddOnPurchase = async (credits: number, price: number) => {
    setLoading(`addon-${credits}`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/auth/signup';
        return;
      }

      // Get the correct price ID from our config
      const topupConfig = STRIPE_CONFIG.topups[credits as keyof typeof STRIPE_CONFIG.topups];
      
      const response = await fetch('/api/stripe/topup-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          creditsAmount: credits,
          priceId: topupConfig.priceId
        })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.success) {
        alert(`Successfully purchased ${credits} credits!`);
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to purchase credits');
      }
    } catch (error) {
      console.error('Credit purchase error:', error);
      alert('Failed to purchase credits. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Free",
      icon: <FaPlay className="w-6 h-6" />,
      price: { monthly: 0, annual: 0 },
      description: "See the magic before you commit",
      aiActions: "15 AI actions/month",
      videoMinutes: "5 minutes of AI video/month",
      features: [
        "15 AI prompt actions per month",
        "5 minutes of AI-generated video",
        "Watermarked exports (preview only)",
        "Basic timeline editing",
        "Community support",
        "720p export quality",
        "10 minutes max video length"
      ],
      limitations: [
        "Watermarked videos",
        "Limited export formats",
        "No priority processing"
      ],
      cta: "Get Started Free",
      popular: false,
      color: "gray"
    },
    {
      name: "Creator",
      icon: <FaBolt className="w-6 h-6" />,
      price: { monthly: 15, annual: 12 },
      description: "Replace your editor for 95% less cost",
      aiActions: "200 AI actions/month",
      videoMinutes: "50 minutes of AI video/month",
      features: [
        "200 AI prompt actions per month",
        "50 minutes of AI-generated video",
        "No watermarks - full exports",
        "Advanced editing tools & AI features",
        "Priority processing queue",
        "Email support",
        "1080p export quality",
        "60 minutes max video length",
        "Custom brand templates"
      ],
      limitations: [],
      cta: "Start Creator Plan",
      popular: true,
      color: "blue"
    },
    {
      name: "Pro",
      icon: <FaRocket className="w-6 h-6" />,
      price: { monthly: 49, annual: 42 },
      description: "Scale content without hiring",
      aiActions: "500 AI actions/month",
      videoMinutes: "150 minutes of AI video/month",
      features: [
        "500 AI prompt actions per month",
        "150 minutes of AI-generated video",
        "Team collaboration (3 seats)",
        "Advanced motion graphics & effects",
        "Bulk asset replacement",
        "Phone & email support",
        "4K export quality",
        "Unlimited video length",
        "Custom integrations",
        "Analytics dashboard"
      ],
      limitations: [],
      cta: "Start Pro Plan",
      popular: false,
      color: "purple"
    },
  ];

  const addOnPacks = [
    {
      type: "Credit Top-ups",
      packs: [
        { amount: "100 credits", credits: 100, price: 8, description: "Perfect for occasional heavy use" },
        { amount: "500 credits", credits: 500, price: 35, description: "Great for busy content months" },
        { amount: "1000 credits", credits: 1000, price: 60, description: "Best value for power users" },
        { amount: "2500 credits", credits: 2500, price: 125, description: "For teams and agencies" }
      ]
    }
  ];

  const comparisonFeatures = [
    {
      category: "AI Editing",
      features: [
        { name: "Natural language prompts", free: true, creator: true, pro: true },
        { name: "Auto-remove silences", free: "Limited", creator: true, pro: true },
        { name: "Auto-generate highlights", free: false, creator: true, pro: true },
        { name: "AI-generated B-roll", free: false, creator: "Basic", pro: true },
        { name: "Dynamic motion graphics", free: false, creator: false, pro: true },
        { name: "Brand style transfer", free: false, creator: false, pro: true }
      ]
    },
    {
      category: "Export & Quality",
      features: [
        { name: "Export quality", free: "720p", creator: "1080p", pro: "4K" },
        { name: "Watermark", free: "Yes", creator: "No", pro: "No" },
        { name: "Export formats", free: "MP4 only", creator: "MP4, MOV", pro: "All formats" },
        { name: "Max video length", free: "10 min", creator: "60 min", pro: "Unlimited" }
      ]
    },
    {
      category: "Collaboration",
      features: [
        { name: "Team seats", free: "1", creator: "1", pro: "3" },
        { name: "Project sharing", free: false, creator: false, pro: true },
        { name: "Comment system", free: false, creator: false, pro: true },
        { name: "Role permissions", free: false, creator: false, pro: "Basic" }
      ]
    }
  ];

  const faqs = [
    {
      question: "How does the blended pricing model work?",
      answer: "You pay a monthly subscription for platform access and included AI actions/video minutes, plus optional pay-as-you-go add-ons when you need more. This gives you predictable costs with flexibility to scale up during busy periods."
    },
    {
      question: "What's the difference between AI actions and AI video minutes?",
      answer: "AI actions are individual editing commands like 'remove silences' or 'add captions'. AI video minutes refer to the total length of video content our AI can generate or heavily process each month. Both are tracked separately."
    },
    {
      question: "What happens when I exceed my monthly limits?",
      answer: "You can continue basic editing, but AI features will pause until next month or you can purchase add-on packs instantly. We'll warn you at 80% and 95% usage so there are no surprises."
    },
    {
      question: "Why not unlimited AI like some competitors?",
      answer: "AI processing costs $0.10-$0.50 per action in compute resources. Like Cursor and Runway, we use usage-based pricing to keep the service sustainable while ensuring you only pay for what you actually use."
    },
    {
      question: "Do unused actions and minutes roll over?",
      answer: "Monthly plan allowances reset each billing cycle, but any add-on packs you purchase never expire and carry forward indefinitely."
    },
    {
      question: "Can I see my usage in real-time?",
      answer: "Yes! Your dashboard shows live usage for both AI actions and video minutes, with detailed breakdowns and warnings as you approach limits. Complete transparency, just like Descript and invideo AI."
    },
    {
      question: "How do you compare to Descript and invideo AI?",
      answer: "We offer more AI actions per dollar, faster processing, and unique features like dynamic motion graphics and brand style transfer. Plus our natural language interface is more intuitive than traditional timeline editing."
    },
    {
      question: "Is there a free trial for paid plans?",
      answer: "Yes! All paid plans include a 7-day free trial with full access to features and your plan's full AI allowance. No credit card required to start."
    },
    {
      question: "What about team billing and enterprise features?",
      answer: "Pro plans include team collaboration for 3 seats. Enterprise offers unlimited seats, SSO, custom integrations, dedicated support, and volume discounts. Contact sales for custom pricing."
    }
  ];




  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'hover') => {
    const colors = {
      gray: {
        bg: 'bg-gray-600',
        text: 'text-gray-400',
        border: 'border-gray-600',
        hover: 'hover:bg-gray-700'
      },
      blue: {
        bg: 'bg-blue-600',
        text: 'text-blue-400',
        border: 'border-blue-500',
        hover: 'hover:bg-blue-700'
      },
      purple: {
        bg: 'bg-purple-600',
        text: 'text-purple-400',
        border: 'border-purple-500',
        hover: 'hover:bg-purple-700'
      },
      gold: {
        bg: 'bg-yellow-600',
        text: 'text-yellow-400',
        border: 'border-yellow-500',
        hover: 'hover:bg-yellow-700'
      }
    };
    return colors[color as keyof typeof colors][variant];
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <FaCheck className="w-4 h-4 text-green-400 mx-auto" />;
    } else if (value === false) {
      return <FaTimes className="w-4 h-4 text-red-400 mx-auto" />;
    } else {
      return <span className="text-sm text-gray-300">{value}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold hover:text-gray-300 transition-colors">
                Tailored Labs
              </Link>
              <div className="flex items-center space-x-2 bg-gray-800 rounded-full px-3 py-1">
                <img 
                  src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                  alt="Built with Bolt" 
                  className="w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-400">Built on Bolt</span>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <Link href="/features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-white font-medium">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                Blog
              </Link>
              <Link
                href="/auth/signup"
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-all"
              >
                Start 7-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Stop Paying for
            <span className="block text-white">
              Expensive Editors
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Get professional video results for less than the cost of one freelance editor. 
            Start free, pay only for what you use.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <span className={`mr-3 ${!isAnnual ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${isAnnual ? 'text-white' : 'text-gray-400'}`}>
              Annual
              <span className="ml-1 text-green-400 text-sm">(Save 20%)</span>
            </span>
          </div>

          {/* Industry Comparison */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 max-w-4xl mx-auto mb-12">
            <h3 className="text-lg font-semibold mb-4">Compare the Real Costs</h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-400">Freelance Editor</div>
                <div className="text-gray-500">$500-2000/video</div>
                <div className="text-gray-500">2-5 day turnaround</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-400">Video Agency</div>
                <div className="text-gray-500">$2000-10k/month</div>
                <div className="text-gray-500">Limited revisions</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-400">Full-time Editor</div>
                <div className="text-gray-500">$60k+ per year</div>
                <div className="text-gray-500">Plus benefits</div>
              </div>
              <div className="text-center border border-blue-500/30 rounded-lg p-2">
                <div className="font-semibold text-blue-400">TailorLabs AI</div>
                <div className="text-blue-300">$15/month</div>
                <div className="text-blue-300">Unlimited revisions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border transition-all duration-200 hover:scale-105 ${
                  plan.popular 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                      <FaStar className="w-3 h-3" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${getColorClasses(plan.color, 'bg')}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    {typeof plan.price.monthly === 'number' ? (
                      <>
                        <span className="text-4xl font-bold">
                          ${isAnnual ? plan.price.annual : plan.price.monthly}
                        </span>
                        <span className="text-gray-400 ml-1">/month</span>
                        {isAnnual && plan.price.monthly > 0 && (
                          <div className="text-sm text-green-400 mt-1">
                            Save ${(plan.price.monthly - plan.price.annual) * 12}/year
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-4xl font-bold">{plan.price.monthly}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(plan.color, 'bg')} bg-opacity-20 ${getColorClasses(plan.color, 'text')}`}>
                      <FaBolt className="w-3 h-3 mr-1" />
                      {plan.aiActions}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(plan.color, 'bg')} bg-opacity-20 ${getColorClasses(plan.color, 'text')} ml-2`}>
                      <FaVideo className="w-3 h-3 mr-1" />
                      {plan.videoMinutes}
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <FaCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, limitIndex) => (
                    <li key={limitIndex} className="flex items-start space-x-3">
                      <FaTimes className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-500">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${getColorClasses(plan.color, 'bg')} ${getColorClasses(plan.color, 'hover')} text-white`}
                >
                  <span>{plan.cta}</span>
                  <FaArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-On Packs */}
      <section className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Scale Up When You Need More</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Hit your monthly limit? No problem. Add-on packs give you instant extra capacity that never expires.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {addOnPacks.map((packType, typeIndex) => (
              <div key={typeIndex} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                <h3 className="text-2xl font-bold mb-6 text-center">{packType.type} Add-Ons</h3>
                <div className="space-y-4">
                  {packType.packs.map((pack, packIndex) => (
                    <div key={packIndex} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                      <div>
                        <div className="font-semibold">{pack.amount}</div>
                        <div className="text-sm text-gray-400">{pack.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-400">${pack.price}</div>
                        <button 
                          onClick={() => handleAddOnPurchase(pack.credits, pack.price)}
                          disabled={loading === `addon-${pack.credits}`}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 transition-colors disabled:opacity-50 flex items-center space-x-1"
                        >
                          {loading === `addon-${pack.credits}` ? (
                            <>
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>...</span>
                            </>
                          ) : (
                            <span>Purchase</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              💡 All add-on packs never expire and work with any plan
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What You Get at Each Level</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Every plan includes our core AI editing features. Higher tiers add power-user capabilities.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
            {comparisonFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="bg-gray-700/50 px-6 py-4">
                  <h3 className="text-lg font-semibold">{category.category}</h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {category.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-700/20 transition-colors">
                      <div className="text-sm font-medium text-gray-300">{feature.name}</div>
                      <div className="text-center">{renderFeatureValue(feature.free)}</div>
                      <div className="text-center">{renderFeatureValue(feature.creator)}</div>
                      <div className="text-center">{renderFeatureValue(feature.pro)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Header row */}
            <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-700/30 border-t border-gray-700">
              <div></div>
              <div className="text-center font-semibold text-gray-400">Free</div>
              <div className="text-center font-semibold text-blue-400">Creator</div>
              <div className="text-center font-semibold text-purple-400">Pro</div>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Dashboard Preview */}
      <section className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Never Get Surprised by Limits</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See exactly how much you've used and what's left. Get warnings before you hit limits.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">What Counts Toward Your Limits?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold">Credit System</div>
                    <div className="text-gray-400 text-sm">Video upload (10 credits), AI generation (35 credits), AI chat (2 credits)</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold">Monthly Allowances</div>
                    <div className="text-gray-400 text-sm">Free: 100 credits, Creator: 1,000 credits, Pro: 5,000 credits</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold text-green-400">Always Free</div>
                    <div className="text-gray-400 text-sm">Manual timeline editing, trimming, basic effects, uploads</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
              <h4 className="text-lg font-semibold mb-6">Live Usage Dashboard</h4>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Credits Used</span>
                  <span className="font-semibold">735 / 1,000</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '73.5%' }}></div>
                </div>
                <div className="text-sm text-gray-400">265 credits remaining this month</div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Recent Activity:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>AI timeline generation (35 credits)</span>
                    <span className="text-gray-500">2 min ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Video upload & analysis (10 credits)</span>
                    <span className="text-gray-500">1 hour ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI chat messages (6 credits)</span>
                    <span className="text-gray-500">3 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowFaq(showFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                >
                  <span className="font-semibold flex items-center space-x-2">
                    <FaQuestionCircle className="w-4 h-4 text-blue-400" />
                    <span>{faq.question}</span>
                  </span>
                  <div className={`transform transition-transform ${showFaq === index ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
                {showFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>





      {/* CTA Section */}
      <section className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Stop Overpaying for Video?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the early creators saving thousands while 10x-ing their content output
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Save Thousands on Video</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <FaUsers className="w-4 h-4" />
              <span>Contact Sales</span>
            </Link>
          </div>
          
          <div className="mt-8 text-sm text-gray-400">
            <p>✨ Start free • No credit card required • Cancel anytime • Save 95% vs hiring editors</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl font-bold">Tailored Labs</div>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Agentic AI powered by latest LLMs. Create professional videos with intelligent automation.
              </p>
              <div className="flex items-center space-x-2">
                <img 
                  src="/bolt/logotext_poweredby_360w/logotext_poweredby_360w.svg" 
                  alt="Powered by Bolt" 
                  className="h-8"
                />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/componentsv2" className="hover:text-white transition-colors">Components</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-500 text-sm">
              © 2024 Tailored Labs. Made with ❤️ for creators everywhere.
            </p>
            <Link
              href="/auth/signup"
              className="mt-4 md:mt-0 bg-white text-black px-6 py-2 rounded-full hover:bg-gray-200 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}