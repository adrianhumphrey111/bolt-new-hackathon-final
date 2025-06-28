'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaTimes, FaVideo, FaArrowRight, FaQuestionCircle, FaStar, FaBolt, FaCrown, FaRocket } from 'react-icons/fa';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showFaq, setShowFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Free",
      icon: <FaVideo className="w-6 h-6" />,
      price: { monthly: 0, annual: 0 },
      description: "Perfect for trying out AI video editing",
      aiActions: 10,
      features: [
        "10 AI prompt actions per month",
        "Watermarked exports",
        "Basic timeline editing",
        "Community support",
        "720p export quality",
        "5 minutes max video length"
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
      name: "Pro",
      icon: <FaBolt className="w-6 h-6" />,
      price: { monthly: 20, annual: 16 },
      description: "For creators and small teams",
      aiActions: 100,
      features: [
        "100 AI prompt actions per month",
        "No watermarks",
        "Advanced editing tools",
        "AI highlights & auto-cuts",
        "Email support",
        "1080p export quality",
        "30 minutes max video length",
        "Custom brand templates"
      ],
      limitations: [],
      cta: "Start Pro Trial",
      popular: true,
      color: "blue"
    },
    {
      name: "Power",
      icon: <FaRocket className="w-6 h-6" />,
      price: { monthly: 50, annual: 40 },
      description: "For power users and growing teams",
      aiActions: 500,
      features: [
        "500 AI prompt actions per month",
        "Team collaboration (5 seats)",
        "Priority AI processing",
        "Advanced motion graphics",
        "Phone & email support",
        "4K export quality",
        "Unlimited video length",
        "Custom integrations",
        "Analytics dashboard"
      ],
      limitations: [],
      cta: "Start Power Trial",
      popular: false,
      color: "purple"
    },
    {
      name: "Enterprise",
      icon: <FaCrown className="w-6 h-6" />,
      price: { monthly: "Custom", annual: "Custom" },
      description: "For large teams and organizations",
      aiActions: "Unlimited",
      features: [
        "Unlimited AI prompt actions",
        "Unlimited team seats",
        "SLA & dedicated support",
        "White-labeling options",
        "On-premise deployment",
        "Custom integrations",
        "Advanced security",
        "Training & onboarding"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
      color: "gold"
    }
  ];

  const tokenPacks = [
    {
      tokens: 50,
      price: 5,
      savings: 0
    },
    {
      tokens: 100,
      price: 10,
      savings: 0
    },
    {
      tokens: 250,
      price: 20,
      savings: 15
    },
    {
      tokens: 500,
      price: 35,
      savings: 25
    }
  ];

  const faqs = [
    {
      question: "What counts as an AI prompt action?",
      answer: "Every time you use AI to edit your video - like 'remove silences', 'add captions', 'create highlights', or 'apply brand style' - that's one AI action. Simple timeline edits like trimming don't count."
    },
    {
      question: "What happens when I run out of AI actions?",
      answer: "You can continue using basic editing features, but AI-powered actions will be paused. You can upgrade your plan or purchase additional token packs to continue using AI features immediately."
    },
    {
      question: "Why do you charge for AI actions instead of unlimited?",
      answer: "AI processing is expensive - each prompt can cost us $0.10-$0.50 in compute. This model keeps our service sustainable while ensuring you only pay for what you use, just like Cursor and other AI tools."
    },
    {
      question: "Can I see my usage in real-time?",
      answer: "Yes! Your dashboard shows exactly how many AI actions you've used this month, with warnings when you're approaching your limit. Full transparency, no surprises."
    },
    {
      question: "Do unused AI actions roll over?",
      answer: "No, AI actions reset each month. However, any token packs you purchase never expire and can be used anytime."
    },
    {
      question: "Is there a free trial for paid plans?",
      answer: "Yes! All paid plans come with a 7-day free trial with full access to features and AI actions. No credit card required to start."
    },
    {
      question: "What video formats do you support?",
      answer: "We support all major formats: MP4, MOV, AVI, MKV, and more. Export in MP4, MOV, or WebM with various quality settings from 720p to 4K."
    },
    {
      question: "How does team collaboration work?",
      answer: "Team plans include shared workspaces, project sharing, comment systems, and role-based permissions. Each team member gets their own AI action allowance."
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="relative z-50 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FaVideo className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Video Editor
            </h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Simple, Transparent
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI-Powered Pricing
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Pay for what you use. Every AI action is tracked transparently. 
            Start free, scale as you grow.
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
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
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

                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(plan.color, 'bg')} bg-opacity-20 ${getColorClasses(plan.color, 'text')}`}>
                    <FaBolt className="w-3 h-3 mr-1" />
                    {typeof plan.aiActions === 'number' 
                      ? `${plan.aiActions} AI actions/month`
                      : `${plan.aiActions} AI actions`
                    }
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
                  href={plan.name === 'Enterprise' ? '/contact' : '/auth/signup'}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      : `${getColorClasses(plan.color, 'bg')} ${getColorClasses(plan.color, 'hover')} text-white`
                  }`}
                >
                  <span>{plan.cta}</span>
                  <FaArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Packs */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Need More AI Actions?</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Purchase additional AI action tokens that never expire. Perfect for busy months or special projects.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {tokenPacks.map((pack, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-200 text-center">
                {pack.savings > 0 && (
                  <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full mb-3 inline-block">
                    Save {pack.savings}%
                  </div>
                )}
                <div className="text-2xl font-bold mb-2">{pack.tokens} Tokens</div>
                <div className="text-3xl font-bold text-blue-400 mb-4">${pack.price}</div>
                <div className="text-sm text-gray-400 mb-4">
                  ${(pack.price / pack.tokens).toFixed(2)} per action
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                  Purchase
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              💡 Token packs never expire and can be used across any plan
            </p>
          </div>
        </div>
      </section>

      {/* Usage Transparency */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Complete Usage Transparency</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See exactly what counts as an AI action and track your usage in real-time
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">What Counts as an AI Action?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold">AI Editing Prompts</div>
                    <div className="text-gray-400 text-sm">"Remove silences", "Add captions", "Create highlights"</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold">Auto-Generated Content</div>
                    <div className="text-gray-400 text-sm">AI-generated B-roll, motion graphics, thumbnails</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold">Style Transfer</div>
                    <div className="text-gray-400 text-sm">Applying brand styles, color grading, format conversion</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-semibold text-green-400">Always Free</div>
                    <div className="text-gray-400 text-sm">Manual timeline editing, trimming, basic effects</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
              <h4 className="text-lg font-semibold mb-4">Live Usage Dashboard</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">AI Actions Used</span>
                  <span className="font-semibold">47 / 100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '47%' }}></div>
                </div>
                <div className="text-sm text-gray-400">
                  53 actions remaining this month
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Recent Actions:</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>"Remove background noise"</span>
                      <span className="text-gray-500">2 min ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>"Add captions"</span>
                      <span className="text-gray-500">1 hour ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>"Create highlight reel"</span>
                      <span className="text-gray-500">3 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4">
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
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who've made the switch to AI-powered video editing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <span>Contact Sales</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FaVideo className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold">AI Video Editor</h3>
              </div>
              <p className="text-gray-400 text-sm">
                The future of video editing is here. Create professional videos with simple prompts.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/editor" className="hover:text-white transition-colors">Editor</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm">
              © 2024 AI Video Editor. Made with ❤️ for creators everywhere.
            </p>
            <Link
              href="/auth/signup"
              className="mt-4 md:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}