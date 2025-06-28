'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaVideo, FaPlay, FaPause, FaArrowRight, FaMagic, FaRocket, FaBolt, FaWandMagicSparkles, FaSparkles, FaRobot, FaEye, FaVolumeUp, FaClosedCaptioning, FaCut, FaImage, FaMusic, FaGlobe, FaShare, FaDownload, FaChevronRight, FaLightbulb, FaFire, FaZap, FaStars } from 'react-icons/fa';

export default function EditorDemo() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const demoPrompts = [
    {
      id: 1,
      prompt: "Remove all silences and add my logo at the end",
      category: "Auto-Edit",
      icon: <FaCut className="w-5 h-5" />,
      description: "AI automatically detects and removes silent gaps, then adds your brand logo",
      result: "✨ Removed 47 seconds of silence • Added logo overlay • Ready to export",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      prompt: "Create a 30-second highlight reel with upbeat music",
      category: "Smart Highlights",
      icon: <FaSparkles className="w-5 h-5" />,
      description: "AI analyzes your content and creates an engaging highlight compilation",
      result: "🎬 Generated highlight reel • Added royalty-free music • Optimized pacing",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      prompt: "Add captions and crop for TikTok format",
      category: "Platform Optimization",
      icon: <FaGlobe className="w-5 h-5" />,
      description: "Automatically generates captions and reformats for vertical social media",
      result: "📱 Added animated captions • Cropped to 9:16 • TikTok-ready format",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      prompt: "Replace all instances of 'old logo' with my new brand assets",
      category: "Brand Transfer",
      icon: <FaImage className="w-5 h-5" />,
      description: "AI identifies and replaces visual elements across your entire video",
      result: "🎨 Found 12 logo instances • Replaced with new brand • Maintained quality",
      color: "from-orange-500 to-red-500"
    },
    {
      id: 5,
      prompt: "Generate B-roll footage for the cooking segment and add background music",
      category: "Content Generation",
      icon: <FaRobot className="w-5 h-5" />,
      description: "AI creates relevant B-roll content and adds complementary audio",
      result: "🍳 Generated 8 B-roll clips • Added ambient kitchen sounds • Seamless integration",
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: 6,
      prompt: "Analyze sentiment and create emotional highlights with matching transitions",
      category: "AI Analysis",
      icon: <FaEye className="w-5 h-5" />,
      description: "Advanced AI understands emotional context and creates dynamic edits",
      result: "💫 Detected 5 emotional peaks • Added dynamic transitions • Enhanced storytelling",
      color: "from-teal-500 to-blue-500"
    }
  ];

  const advancedFeatures = [
    {
      title: "Neural Scene Detection",
      description: "AI automatically identifies scene changes, speakers, and key moments",
      icon: <FaEye className="w-6 h-6" />,
      examples: ["Auto-chapter creation", "Speaker identification", "Scene transitions"]
    },
    {
      title: "Contextual Understanding",
      description: "Understands your content's meaning, not just visual patterns",
      icon: <FaRobot className="w-6 h-6" />,
      examples: ["Topic-based editing", "Mood detection", "Content relevance"]
    },
    {
      title: "Dynamic Asset Generation",
      description: "Creates custom graphics, animations, and effects on demand",
      icon: <FaWandMagicSparkles className="w-6 h-6" />,
      examples: ["Custom lower thirds", "Animated backgrounds", "Brand-matched graphics"]
    },
    {
      title: "Multi-Modal Processing",
      description: "Analyzes video, audio, and text simultaneously for perfect edits",
      icon: <FaVolumeUp className="w-6 h-6" />,
      examples: ["Audio-visual sync", "Transcript-based editing", "Music matching"]
    }
  ];

  const futuristicPrompts = [
    "Transform this into a cyberpunk aesthetic with neon overlays and glitch effects",
    "Create a documentary-style edit with professional color grading and interview cuts",
    "Generate a movie trailer version with dramatic music and quick cuts",
    "Add holographic UI elements and futuristic sound design",
    "Create multiple versions optimized for YouTube, TikTok, and LinkedIn simultaneously",
    "Analyze the speaker's energy and add dynamic zoom effects during high-energy moments",
    "Replace the background with a virtual studio and add professional lighting effects",
    "Generate an accessibility version with audio descriptions and enhanced captions"
  ];

  const typePrompt = (prompt: string) => {
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
        // Show processing animation
        setTimeout(() => {
          setShowResult(true);
        }, 1500);
      }
    };
    typeWriter();
  };

  const handleDemoSelect = (index: number) => {
    setCurrentDemo(index);
    typePrompt(demoPrompts[index].prompt);
  };

  useEffect(() => {
    // Auto-cycle through demos
    const interval = setInterval(() => {
      if (!isTyping) {
        const nextDemo = (currentDemo + 1) % demoPrompts.length;
        handleDemoSelect(nextDemo);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [currentDemo, isTyping]);

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
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-blue-500/30 mb-8">
            <FaLightbulb className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-sm font-medium">Live Interactive Demo</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            The Future of
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Video Editing is Here
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Experience next-generation AI that understands your creative vision and brings it to life with simple prompts. 
            No timelines, no complexity—just pure creative magic.
          </p>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Demo Interface */}
            <div className="order-2 lg:order-1">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
                {/* Mock Video Player */}
                <div className="relative bg-black aspect-video">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaPlay className="w-8 h-8 text-white ml-1" />
                      </div>
                      <p className="text-gray-400">Sample Video: Product Demo</p>
                      <p className="text-sm text-gray-500">Duration: 5:23</p>
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
                </div>

                {/* Prompt Interface */}
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      What would you like to do with this video?
                    </label>
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
                        <span className="text-blue-300">AI is analyzing your request...</span>
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
                          <p className="text-gray-300 text-sm mt-1">{demoPrompts[currentDemo].result}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => typePrompt(currentPrompt)}
                  >
                    <FaMagic className="w-4 h-4" />
                    <span>Apply AI Magic</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Demo Controls */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold mb-6">Try These AI-Powered Prompts</h2>
              <p className="text-gray-300 mb-8">
                Click any prompt below to see our AI in action. Each example showcases different capabilities 
                that would take hours in traditional editors.
              </p>

              <div className="space-y-4">
                {demoPrompts.map((demo, index) => (
                  <button
                    key={demo.id}
                    onClick={() => handleDemoSelect(index)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                      currentDemo === index
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${demo.color} flex items-center justify-center flex-shrink-0`}>
                        {demo.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-blue-400">{demo.category}</span>
                          {currentDemo === index && <FaZap className="w-3 h-3 text-yellow-400" />}
                        </div>
                        <p className="font-medium text-white mb-1">"{demo.prompt}"</p>
                        <p className="text-sm text-gray-400">{demo.description}</p>
                      </div>
                      <FaChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                        currentDemo === index ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Showcase */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Beyond Traditional Editing
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our AI doesn't just cut and splice—it understands context, emotion, and creative intent 
              to deliver results that feel crafted by a professional editor.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {advancedFeatures.map((feature, index) => (
              <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-200 group">
                <div className="text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
                <ul className="space-y-1">
                  {feature.examples.map((example, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Futuristic Prompts Gallery */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Imagine the Possibilities
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              These are real prompts our AI can handle today. The future of video editing 
              is limited only by your imagination.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {futuristicPrompts.map((prompt, index) => (
              <div key={index} className="group">
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-200 hover:scale-105">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaStars className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium mb-2">"{prompt}"</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <FaFire className="w-3 h-3 text-orange-400" />
                        <span>Advanced AI Capability</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Experience the Magic?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who've already discovered the future of video editing. 
            Start with our free tier and see what's possible.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Creating for Free</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/editor"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <FaRocket className="w-4 h-4" />
              <span>Open Full Editor</span>
            </Link>
          </div>

          <div className="text-sm text-gray-400">
            <p>✨ No credit card required • 15 free AI actions • Instant access</p>
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
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
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
              Start Free Trial
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}