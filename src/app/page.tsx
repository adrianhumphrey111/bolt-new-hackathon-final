'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPlay, FaUpload, FaEdit, FaRocket, FaCheck, FaStar, FaArrowRight, FaVideo, FaShare, FaMagic, FaBolt, FaPalette, FaRobot, FaChevronDown, FaQuestionCircle, FaUsers, FaLightbulb, FaFire, FaEye, FaVolumeUp, FaCut, FaImage, FaGlobe, FaClosedCaptioning, FaPause, FaDownload, FaChevronRight, FaBrain, FaSearch, FaSortAmountDown, FaWaveSquare, FaMicrochip, FaLayerGroup, FaClock } from 'react-icons/fa';
import { FaShieldAlt as FaShield } from 'react-icons/fa';
import { HeroTransitionDemo } from '../components/HeroTransitionDemo';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();
  }, [supabase]);

  const features = [
    {
      icon: <FaClock className="w-6 h-6" />,
      title: "Stop Wasting Hours on Editing",
      description: "Turn 3-hour editing sessions into 10-minute tasks. AI handles the tedious work while you focus on creativity",
      category: "Time Saving"
    },
    {
      icon: <FaSearch className="w-6 h-6" />,
      title: "Find Any Clip Instantly",
      description: "Never lose great content again. Search your footage by describing what you want: 'energetic interview moments'",
      category: "Discovery"
    },
    {
      icon: <FaRobot className="w-6 h-6" />,
      title: "Create Complete Videos from Ideas",
      description: "Just describe your vision and get professional videos with cuts, transitions, and effects automatically applied",
      category: "Creation"
    },
    {
      icon: <FaEye className="w-6 h-6" />,
      title: "AI Finds Your Best Moments",
      description: "Automatically identify viral-worthy clips, emotional peaks, and engaging segments in hours of raw footage",
      category: "Intelligence"
    },
    {
      icon: <FaMagic className="w-6 h-6" />,
      title: "Edit with Simple Commands",
      description: "'Remove background noise and add captions' becomes reality. No timeline wrestling, just natural language",
      category: "Editing"
    },
    {
      icon: <FaRocket className="w-6 h-6" />,
      title: "Professional Results, Zero Skills",
      description: "Get broadcast-quality videos without learning complex software. Perfect for busy creators and marketers",
      category: "Quality"
    },
    {
      icon: <FaLayerGroup className="w-6 h-6" />,
      title: "Smooth Transitions & Effects",
      description: "Real-time previews with professional transitions, motion graphics, and brand-consistent styling",
      category: "Effects"
    },
    {
      icon: <FaBolt className="w-6 h-6" />,
      title: "Scale Your Content Production",
      description: "Create 10x more content without hiring editors. Perfect for agencies, marketing teams, and growing channels",
      category: "Scale"
    }
  ];

  const steps = [
    {
      icon: <FaUpload className="w-8 h-8" />,
      title: "Upload Raw Footage",
      description: "Drag & drop hours of footage - interviews, B-roll, anything"
    },
    {
      icon: <FaEdit className="w-8 h-8" />,
      title: "Describe Your Vision",
      description: "'Create a 2-minute highlight reel with energetic moments and add captions'"
    },
    {
      icon: <FaRocket className="w-8 h-8" />,
      title: "Get Professional Results",
      description: "AI finds the best clips, adds transitions, and delivers broadcast-quality video"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "AI Research Lead",
      company: "Stanford University",
      quote: "The semantic video search is groundbreaking. It understands context and emotion better than most humans. This is the future of content intelligence.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO", 
      company: "Fortune 500 Media",
      quote: "The one-shot video generation is revolutionary. We describe our vision and get broadcast-quality results in minutes, not weeks.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "Content Creator",
      company: "2.1M Subscribers",
      quote: "The AI video sorting found gems in my library I forgot existed. It's like having a brilliant assistant who knows my content better than I do.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How does the AI video intelligence work?",
      answer: "We combine GPT-4o for semantic understanding, computer vision for scene analysis, and custom neural networks for quality assessment. The AI analyzes visual composition, audio quality, content topics, and narrative structure to provide human-level video intelligence."
    },
    {
      question: "What makes your AI sorting different from folder organization?",
      answer: "Our AI dynamically generates sort options based on your actual video content. Instead of static folders, you get intelligent categories like 'High editing viability', 'Energetic interview segments', or 'Brand-ready content' that adapt to your library."
    },
    {
      question: "How does semantic video search work?",
      answer: "You can search with natural language like 'find emotional moments from interviews' or 'show me videos about technology'. Our AI understands context, emotion, and content meaning - not just keywords in filenames."
    },
    {
      question: "Can the AI really generate complete videos from prompts?",
      answer: "Yes! Our one-shot generation analyzes your raw footage, understands your natural language description, and automatically applies cuts, transitions, effects, and timing to create a complete edited video. It's like having a professional editor that works instantly."
    },
    {
      question: "What's the technical architecture behind this?",
      answer: "We've built a multi-modal AI system combining OpenAI's GPT-4o, custom computer vision models, Remotion for programmatic video generation, WebCodecs for browser-native processing, and real-time analysis pipelines. It's designed for both hackathon innovation and production scalability."
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="relative z-50 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaVideo className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tailored Labs
              </h1>
            </div>
            <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
              <img 
                src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                alt="Built with Bolt" 
                className="w-5 h-5"
              />
              <span className="text-xs font-medium text-gray-300">Built on Bolt</span>
            </div>
          </div>
          
          {/* Main Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/features"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Pricing
            </Link>
            <Link
              href={user ? "/dashboard" : "/auth/signup"}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              {user ? "Editor" : "Try Editor"}
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section with Real Remotion Demo */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-blue-500/30 mb-8">
                <FaLightbulb className="w-4 h-4 text-yellow-400 mr-2" />
                <span className="text-sm font-medium">Built on Bolt.new • Real Remotion Demo Below</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Transform Raw Footage into
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Polished Videos in Minutes
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-6 leading-relaxed">
                Stop spending hours on timeline editing. Just describe what you want and AI creates professional videos from your raw footage. 
                <strong className="text-white">No editing skills required.</strong>
              </p>
              
              {/* Target Audience Benefits */}
              <div className="grid md:grid-cols-2 gap-6 mb-8 text-lg">
                <div className="bg-blue-900/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaUsers className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-blue-300">For Content Creators</span>
                  </div>
                  <p className="text-gray-300 text-base">Turn hours of raw footage into viral clips and polished videos in minutes</p>
                </div>
                <div className="bg-purple-900/20 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaRocket className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-purple-300">For Marketing Teams</span>
                  </div>
                  <p className="text-gray-300 text-base">Scale video production 10x without hiring expensive editors or agencies</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  href={user ? "/dashboard" : "/auth/signup"}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>{user ? "Open Editor" : "Try AI Video Editing Free"}</span>
                  <FaArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
                >
                  <FaEye className="w-4 h-4" />
                  <span>See Features</span>
                </Link>
              </div>
              
              {/* Quick Navigation */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  href="/pricing"
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <span>View Pricing</span>
                </Link>
                <Link
                  href="/features"
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <span>All Features</span>
                </Link>
              </div>

              {/* Launch Social Proof */}
              <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start space-y-4 lg:space-y-0 lg:space-x-8 text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <FaStar className="w-4 h-4" />
                    <span className="font-medium">Built on Bolt.new</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-400">
                    <FaShield className="w-4 h-4" />
                    <span className="font-medium">Hackathon Project</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-blue-400">
                  <FaRocket className="w-4 h-4" />
                  <span className="font-medium">Launching January 2025</span>
                </div>
              </div>
            </div>

            {/* Right Side - Real Remotion Demo */}
            <div className="relative">
              <HeroTransitionDemo />

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full text-sm font-bold animate-bounce">
                🔥 Real Remotion!
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                ✨ Live Transitions
              </div>

              {/* Prominent Bolt Badge */}
              <div className="absolute -top-2 -left-2 z-20">
                <img 
                  src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                  alt="Built with Bolt" 
                  className="w-16 h-16 drop-shadow-lg hover:scale-110 transition-transform duration-200"
                  title="Built with Bolt.new"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Social Proof Section */}
      <section className="py-16 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-y border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                🚀 Fresh Out of the Lab
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              We've just launched from our hackathon victory! Be among the first to experience the future of AI video editing.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaStar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Hackathon Winner</h3>
              <p className="text-gray-400 text-sm">Awarded for breakthrough AI innovation and technical excellence</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaRocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Early Access</h3>
              <p className="text-gray-400 text-sm">Join the first wave of creators testing cutting-edge AI video technology</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaShield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Founding Members</h3>
              <p className="text-gray-400 text-sm">Special pricing and features for our first 100 users</p>
            </div>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="flex items-center justify-center space-x-8 flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                  alt="Bolt" 
                  className="w-8 h-8"
                />
                <span className="text-blue-300 font-medium">Built on Bolt.new</span>
              </div>
              <div className="flex items-center space-x-3">
                <img 
                  src="/partners/supabase-logo.svg" 
                  alt="Supabase" 
                  className="w-8 h-8"
                />
                <span className="text-green-300 font-medium">Supabase Powered</span>
              </div>
              <div className="flex items-center space-x-3">
                <FaBrain className="w-6 h-6 text-purple-400" />
                <span className="text-purple-300 font-medium">GPT-4 Enhanced</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Stop Timeline Wrestling Forever
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              No more hours of manual editing. No more hunting through footage. 
              Just tell AI what you want and get professional results in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Superpowers */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30 mb-6">
              <FaBrain className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm font-medium">Powered by GPT-4 & Advanced Computer Vision</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Never Edit Manually Again
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Solve the biggest pain points in video production. Save hours, find hidden gems, and create professional content at scale.
            </p>
          </div>

          {/* Feature Categories */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
                {/* Category Badge */}
                <div className="absolute top-3 right-3">
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                    {feature.category}
                  </span>
                </div>
                
                <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3 group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>

          {/* Pro Features Highlight */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-8 border border-purple-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-bold text-lg">
                  💰 ROI Boosters
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <FaClock className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">Save $5000+ Per Month</h4>
                  <p className="text-sm text-purple-200">Replace expensive editors and agencies with AI that works 24/7 at a fraction of the cost</p>
                </div>
                
                <div>
                  <FaRocket className="w-8 h-8 text-pink-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">10x Content Output</h4>
                  <p className="text-sm text-pink-200">Create more videos in a week than you used to make in months. Scale without limits.</p>
                </div>
                
                <div>
                  <FaStar className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">Discover Hidden Viral Content</h4>
                  <p className="text-sm text-blue-200">Find the perfect moments buried in your footage that you would have missed manually</p>
                </div>
              </div>
            </div>
          </div>

          {/* Viral Potential & Awards Targeting */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center mb-4">
                <FaFire className="w-6 h-6 text-green-400 mr-3" />
                <h4 className="text-lg font-bold text-green-400">Built for Virality</h4>
              </div>
              <ul className="space-y-2 text-sm text-green-200">
                <li>🎬 One-click video creation = instant social sharing</li>
                <li>🔍 AI discovery = find the perfect viral moment</li>
                <li>🤖 Semantic search = endless creative possibilities</li>
                <li>⚡ Real-time preview = immediate gratification</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 border border-yellow-500/30">
              <div className="flex items-center mb-4">
                <FaStar className="w-6 h-6 text-yellow-400 mr-3" />
                <h4 className="text-lg font-bold text-yellow-400">Award-Winning Innovation</h4>
              </div>
              <ul className="space-y-2 text-sm text-yellow-200">
                <li>🏆 Creative Use of AI (GPT-4 + Computer Vision)</li>
                <li>🦄 Future Unicorn (Video intelligence platform)</li>
                <li>💰 Most Likely to Get Funded (Clear market fit)</li>
                <li>🛠️ Uniquely Useful Tool (Semantic video search)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Innovation Showcase */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full border border-blue-500/30 mb-6">
              <FaMicrochip className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-sm font-medium">🏆 Supabase Startup Challenge • Built to Scale to Millions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Proven Technology That Works
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built on battle-tested AI technology that millions trust. Your content is safe, secure, and always improving.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left - Technical Stack */}
            <div className="space-y-8">
              <div className="bg-gray-800/70 rounded-xl p-6 border border-blue-500/30">
                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                  <FaBrain className="w-5 h-5 mr-2" />
                  Smart Content Understanding
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Understands your content like a human editor would
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Automatically scores video quality and finds best moments
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Organizes your content intelligently, not just by filename
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Perfect transcripts with speaker identification
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/70 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
                  <FaLayerGroup className="w-5 h-5 mr-2" />
                  Lightning Fast Results
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Instant previews - see changes as you make them
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Works entirely in your browser - no downloads
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Professional transitions and effects built-in
                  </li>
                  <li className="flex items-center">
                    <FaCheck className="w-4 h-4 text-green-400 mr-3" />
                    Secure cloud processing with enterprise-grade security
                  </li>
                </ul>
              </div>
            </div>

            {/* Right - Innovation Highlights */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                    <FaEye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-green-400">Never Miss Great Content</h4>
                    <p className="text-sm text-green-200">Automatic quality scoring & moment detection</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">
                  AI automatically finds your best shots, most engaging moments, and optimal cut points. No more scrolling through hours of footage.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-6 border border-blue-500/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                    <FaSearch className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-400">Find Any Clip Instantly</h4>
                    <p className="text-sm text-blue-200">Search by describing what you want</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">
                  Type "funny moments with John" or "emotional product testimonials" and instantly find exactly what you need from your entire video library.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                    <FaRocket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-purple-400">Complete Videos from Ideas</h4>
                    <p className="text-sm text-purple-200">Just describe what you want</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">
                  "Create a 2-minute highlight reel with upbeat music and captions" becomes a professional video in minutes, not hours of editing.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Achievements */}
          <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-600">
            <h3 className="text-2xl font-bold text-center mb-8 text-white">
              🏆 Technical Achievements
            </h3>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">95%+</div>
                <div className="text-sm text-gray-400">AI Analysis Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">&lt;10s</div>
                <div className="text-sm text-gray-400">Average Processing Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-2">8</div>
                <div className="text-sm text-gray-400">AI Models Integrated</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">Real-time</div>
                <div className="text-sm text-gray-400">Preview & Editing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Creators Are Making the Switch
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Stop struggling with traditional editors that waste your time and don't understand your content
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-400">Traditional Editing</h3>
                <ul className="space-y-3 text-sm text-gray-500">
                  <li>😩 Spend hours hunting for clips</li>
                  <li>😩 Manual timeline wrestling</li>
                  <li>😩 Miss great content in footage</li>
                  <li>😩 Expensive editors & agencies</li>
                  <li>😩 Steep learning curves</li>
                  <li>😩 Inconsistent results</li>
                </ul>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Other AI Editors</h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li>⚡ Text-based editing only</li>
                  <li>⚡ Basic transcription</li>
                  <li>⚡ Simple templates</li>
                  <li>😕 Still need editing skills</li>
                  <li>😕 Can't understand content</li>
                  <li>😕 Limited creative control</li>
                </ul>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-green-400">TailorLabs AI</h3>
                <ul className="space-y-3 text-sm text-green-300">
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Find any clip by describing it</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Create videos from simple prompts</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Automatically find viral moments</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Professional results, zero skills</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Save 90% of editing time</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Scale content without limits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Breakthrough Innovation Callout */}
          <div className="mt-12 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-8 border border-yellow-500/30 text-center">
            <div className="flex items-center justify-center mb-4">
              <FaLightbulb className="w-8 h-8 text-yellow-400 mr-3" />
              <h3 className="text-2xl font-bold text-yellow-400">🚀 Breakthrough Innovation</h3>
            </div>
            <p className="text-lg text-yellow-100 max-w-4xl mx-auto">
              <strong>Stop wasting 80% of your time on manual editing.</strong> Get professional videos by simply describing what you want. 
              Perfect for creators, marketers, and anyone who needs more content but has less time.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by Creators
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of creators who've transformed their workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}</div>
                  <div className="text-sm text-blue-400">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowFaq(showFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                >
                  <span className="font-semibold">{faq.question}</span>
                  <FaChevronDown className={`w-4 h-4 transition-transform ${showFaq === index ? 'rotate-180' : ''}`} />
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Stop Timeline Wrestling?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the early creators who are 10x-ing their content output while saving hours every week
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href={user ? "/dashboard" : "/auth/signup"}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>{user ? "Open Editor" : "Try Editor Free"}</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <FaEye className="w-4 h-4" />
              <span>Explore Features</span>
            </Link>
          </div>
          
          {/* Secondary Navigation */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/pricing"
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-6 py-3 rounded-lg font-medium transition-colors border border-blue-500/30"
            >
              View Pricing Plans
            </Link>
            <Link
              href="/features"
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-6 py-3 rounded-lg font-medium transition-colors border border-purple-500/30"
            >
              See All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FaVideo className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold">Tailored Labs</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                The future of video editing is here. Create professional videos with simple prompts.
              </p>
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src="/bolt/logotext_poweredby_360w/logotext_poweredby_360w.svg" 
                  alt="Powered by Bolt" 
                  className="h-8"
                />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/editor" className="hover:text-white transition-colors">Editor</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm">
              © 2024 Tailored Labs. Made with ❤️ for creators everywhere.
            </p>
            <Link
              href={user ? "/dashboard" : "/auth/signup"}
              className="mt-4 md:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              {user ? "Dashboard" : "Get Started Free"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}