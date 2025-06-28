'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPlay, FaUpload, FaEdit, FaRocket, FaCheck, FaStar, FaArrowRight, FaVideo, FaShare, FaMagic, FaBolt, FaPalette, FaRobot, FaChevronDown, FaQuestionCircle, FaUsers, FaShield, FaLightbulb, FaFire, FaEye, FaVolumeUp, FaCut, FaImage, FaGlobe, FaClosedCaptioning, FaPause, FaDownload, FaChevronRight } from 'react-icons/fa';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const heroPrompts = [
    {
      prompt: "Remove all silences and add my logo at the end",
      result: "✨ Removed 47 seconds of silence • Added logo overlay • Ready to export",
      category: "Auto-Edit",
      color: "from-blue-500 to-cyan-500"
    },
    {
      prompt: "Create a 30-second highlight reel with upbeat music",
      result: "🎬 Generated highlight reel • Added royalty-free music • Optimized pacing",
      category: "Smart Highlights", 
      color: "from-purple-500 to-pink-500"
    },
    {
      prompt: "Add captions and crop for TikTok format",
      result: "📱 Added animated captions • Cropped to 9:16 • TikTok-ready format",
      category: "Platform Optimization",
      color: "from-green-500 to-emerald-500"
    },
    {
      prompt: "Replace background with virtual studio and add professional lighting",
      result: "🎥 Applied virtual studio • Enhanced lighting • Professional quality",
      category: "AI Enhancement",
      color: "from-orange-500 to-red-500"
    }
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [supabase, router]);

  const typePrompt = (prompt: string, result: string) => {
    setIsTyping(true);
    setCurrentPrompt('');
    setShowResult(false);
    
    let i = 0;
    const typeWriter = () => {
      if (i < prompt.length) {
        setCurrentPrompt(prompt.slice(0, i + 1));
        i++;
        setTimeout(typeWriter, 30);
      } else {
        setIsTyping(false);
        // Show processing animation then result
        setTimeout(() => {
          setShowResult(true);
        }, 1500);
      }
    };
    typeWriter();
  };

  // Auto-cycle through demo prompts
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTyping) {
        const nextDemo = (currentDemo + 1) % heroPrompts.length;
        setCurrentDemo(nextDemo);
        typePrompt(heroPrompts[nextDemo].prompt, heroPrompts[nextDemo].result);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [currentDemo, isTyping]);

  // Start first demo on mount
  useEffect(() => {
    setTimeout(() => {
      typePrompt(heroPrompts[0].prompt, heroPrompts[0].result);
    }, 1000);
  }, []);

  // Simulate video progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => (prev >= 100 ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const features = [
    {
      icon: <FaRobot className="w-6 h-6" />,
      title: "Auto-Generate Highlight Reels",
      description: "AI analyzes your content and creates engaging highlight reels automatically"
    },
    {
      icon: <FaPalette className="w-6 h-6" />,
      title: "Dynamic Motion Graphics",
      description: "Generate stunning animations and graphics directly from your script"
    },
    {
      icon: <FaBolt className="w-6 h-6" />,
      title: "Brand Style Transfer",
      description: "Apply your brand colors, fonts, and style across all videos instantly"
    },
    {
      icon: <FaMagic className="w-6 h-6" />,
      title: "Smart B-Roll Placement",
      description: "AI intelligently adds relevant B-roll footage and overlays"
    }
  ];

  const steps = [
    {
      icon: <FaUpload className="w-8 h-8" />,
      title: "Upload Your Video",
      description: "Drag & drop your footage or record directly in the browser"
    },
    {
      icon: <FaEdit className="w-8 h-8" />,
      title: "Type Your Prompt",
      description: "Describe what you want: 'Remove silences and add my logo at the end'"
    },
    {
      icon: <FaRocket className="w-8 h-8" />,
      title: "Instantly Preview",
      description: "Watch AI work its magic, refine if needed, then publish"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Content Creator",
      company: "TechTalk",
      quote: "This is literally magic. I went from 4 hours of editing to 10 minutes of prompts.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Marketing Director", 
      company: "StartupCo",
      quote: "Our team's video output increased 10x. The AI understands exactly what we need.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "YouTuber",
      company: "1.2M Subscribers",
      quote: "I can finally focus on creating content instead of spending days in editing software.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How does the AI understand my editing requests?",
      answer: "Our AI is trained on millions of video editing patterns and natural language instructions. It understands context, timing, and creative intent to execute complex edits from simple prompts."
    },
    {
      question: "What video formats are supported?",
      answer: "We support all major formats including MP4, MOV, AVI, and more. The AI automatically optimizes your output for any platform - YouTube, TikTok, Instagram, or custom specifications."
    },
    {
      question: "Is my content private and secure?",
      answer: "Absolutely. Your videos are encrypted in transit and at rest. We never store your content longer than necessary for processing, and you maintain full ownership of your work."
    },
    {
      question: "How accurate is the AI editing?",
      answer: "Our AI achieves 95%+ accuracy on most editing tasks. For complex requests, you can refine with follow-up prompts or make manual adjustments in our intuitive timeline editor."
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FaVideo className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Video Editor
            </h1>
          </div>
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

      {/* Enhanced Hero Section with Interactive Demo */}
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
                <span className="text-sm font-medium">Live AI Demo Below</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Edit Videos with
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Prompts. AI Does the Rest.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                Upload, edit, and publish pro-quality videos just by describing what you want. 
                The future of video editing is here—no timeline wrestling required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  href="/auth/signup"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <FaArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/editor-demo"
                  className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
                >
                  <FaPlay className="w-4 h-4" />
                  <span>Watch Full Demo</span>
                </Link>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <FaUsers className="w-4 h-4" />
                  <span>50,000+ creators</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaVideo className="w-4 h-4" />
                  <span>1M+ videos created</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaShield className="w-4 h-4" />
                  <span>Enterprise secure</span>
                </div>
              </div>
            </div>

            {/* Right Side - Interactive Demo */}
            <div className="relative">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                {/* Mock Video Player */}
                <div className="relative bg-black aspect-video">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <FaPlay className="w-8 h-8 text-white ml-1" />
                      </div>
                      <p className="text-gray-300 font-medium">Sample Video: Product Demo</p>
                      <p className="text-sm text-gray-500">Duration: 5:23 • 1080p</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 bg-gray-600 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300">2:34 / 5:23</span>
                    </div>
                  </div>

                  {/* Live Demo Badge */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>LIVE DEMO</span>
                    </div>
                  </div>
                </div>

                {/* AI Prompt Interface */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">
                        AI Video Editor
                      </label>
                      <div className="flex items-center space-x-1">
                        {heroPrompts.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              currentDemo === index ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentPrompt}
                        readOnly
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        placeholder="Type your editing request..."
                      />
                      {isTyping && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Processing Animation */}
                  {isTyping && (
                    <div className="mb-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                          <span className="text-blue-300 font-medium">AI is analyzing your request...</span>
                          <div className="text-xs text-blue-400 mt-1">
                            Detecting scenes • Understanding context • Preparing edits
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result Display */}
                  {showResult && !isTyping && (
                    <div className="mb-4 p-4 bg-green-600/10 border border-green-500/30 rounded-lg animate-in fade-in-0 duration-500">
                      <div className="flex items-start space-x-3">
                        <FaCheck className="w-5 h-5 text-green-400 mt-0.5" />
                        <div>
                          <p className="text-green-300 font-medium">Processing Complete!</p>
                          <p className="text-gray-300 text-sm mt-1">{heroPrompts[currentDemo].result}</p>
                          <div className="flex items-center space-x-4 mt-3">
                            <button className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors">
                              Preview Changes
                            </button>
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors flex items-center space-x-1">
                              <FaDownload className="w-3 h-3" />
                              <span>Export</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => typePrompt(heroPrompts[currentDemo].prompt, heroPrompts[currentDemo].result)}
                  >
                    <FaMagic className="w-4 h-4" />
                    <span>Apply AI Magic</span>
                  </button>

                  {/* Quick Actions */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded transition-colors flex items-center justify-center space-x-1">
                      <FaCut className="w-3 h-3" />
                      <span>Remove Silences</span>
                    </button>
                    <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded transition-colors flex items-center justify-center space-x-1">
                      <FaClosedCaptioning className="w-3 h-3" />
                      <span>Add Captions</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full text-sm font-bold animate-bounce">
                🔥 Try it now!
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                ✨ 100% Free to try
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
              How It Works
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Three simple steps to transform your raw footage into polished videos
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              AI Superpowers
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Go beyond basic editing with AI features that understand your creative vision
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-200 group">
                <div className="text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose Us Over Descript?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              We love Descript, but we've built something even more magical
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-400">Traditional Editors</h3>
                <ul className="space-y-3 text-sm text-gray-500">
                  <li>Complex timeline interfaces</li>
                  <li>Hours of manual work</li>
                  <li>Steep learning curve</li>
                  <li>Limited automation</li>
                </ul>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Descript</h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li>Text-based editing</li>
                  <li>Good transcription</li>
                  <li>Some AI features</li>
                  <li>Still requires manual work</li>
                </ul>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-green-400">Our AI Editor</h3>
                <ul className="space-y-3 text-sm text-green-300">
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Natural language prompts</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Fully automated editing</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>Zero learning curve</span>
                  </li>
                  <li className="flex items-center justify-center space-x-2">
                    <FaCheck className="w-3 h-3" />
                    <span>AI-generated graphics</span>
                  </li>
                </ul>
              </div>
            </div>
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
            Ready to Experience the Future?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who've already made the switch to AI-powered video editing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Creating for Free</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/editor-demo"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <FaPlay className="w-4 h-4" />
              <span>Try Full Demo</span>
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