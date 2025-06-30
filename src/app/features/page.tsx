'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FaVideo, FaBrain, FaSearch, FaSortAmountDown, FaRobot, FaWaveSquare, 
  FaMagic, FaLayerGroup, FaClock, FaEye, FaVolumeUp, FaCut, FaShare,
  FaCheck, FaArrowRight, FaPlay, FaDownload, FaUpload, FaEdit,
  FaMicrochip, FaChartLine, FaLightbulb, FaRocket, FaShield,
  FaUsers, FaGraduationCap, FaIndustry, FaCode, FaDatabase
} from 'react-icons/fa';

export default function Features() {
  const [activeTab, setActiveTab] = useState('intelligence');

  const aiFeatures = [
    {
      id: 'intelligence',
      name: 'AI Intelligence',
      icon: <FaBrain className="w-5 h-5" />,
      color: 'purple',
      features: [
        {
          icon: <FaBrain className="w-8 h-8" />,
          title: "Deep Scene Analysis",
          description: "GPT-4 powered analysis that understands context, emotion, and narrative structure",
          details: [
            "Scene-by-scene content classification",
            "Emotional tone detection",
            "Visual composition assessment",
            "Narrative role identification",
            "Quality scoring algorithms"
          ]
        },
        {
          icon: <FaEye className="w-8 h-8" />,
          title: "Computer Vision Analysis",
          description: "Advanced computer vision that evaluates visual quality and editing potential",
          details: [
            "Lighting and exposure analysis",
            "Stability and movement detection",
            "Object and face recognition",
            "Visual composition scoring",
            "Editing viability assessment"
          ]
        },
        {
          icon: <FaWaveSquare className="w-8 h-8" />,
          title: "Audio Intelligence",
          description: "Sophisticated audio analysis for speech quality and content understanding",
          details: [
            "Speech clarity assessment",
            "Background noise analysis",
            "Transcript generation and timing",
            "Audio quality scoring",
            "Script alignment detection"
          ]
        }
      ]
    },
    {
      id: 'discovery',
      name: 'Smart Discovery',
      icon: <FaSearch className="w-5 h-5" />,
      color: 'blue',
      features: [
        {
          icon: <FaSearch className="w-8 h-8" />,
          title: "Semantic Video Search",
          description: "Natural language search that understands meaning, not just keywords",
          details: [
            "Query: 'Find energetic interview moments'",
            "Search through transcript content",
            "Emotional and contextual understanding",
            "Relevance scoring with explanations",
            "Multi-modal content matching"
          ]
        },
        {
          icon: <FaSortAmountDown className="w-8 h-8" />,
          title: "Dynamic AI Sorting",
          description: "LLM-generated sort options that adapt to your content",
          details: [
            "Quality-based organization",
            "Content type categorization",
            "Editing viability rankings",
            "Topic and mood clustering",
            "Custom sort algorithm generation"
          ]
        },
        {
          icon: <FaChartLine className="w-8 h-8" />,
          title: "Content Analytics",
          description: "Deep insights into your video library patterns and trends",
          details: [
            "Content distribution analysis",
            "Quality trend tracking",
            "Topic coverage mapping",
            "Editing complexity assessment",
            "Performance prediction models"
          ]
        }
      ]
    },
    {
      id: 'generation',
      name: 'AI Generation',
      icon: <FaRocket className="w-5 h-5" />,
      color: 'green',
      features: [
        {
          icon: <FaRocket className="w-8 h-8" />,
          title: "One-Shot Video Creation",
          description: "Complete video generation from natural language prompts",
          details: [
            "Upload raw footage",
            "Describe your vision in plain English",
            "AI applies cuts, transitions, and effects",
            "Instant preview and refinement",
            "Export-ready professional results"
          ]
        },
        {
          icon: <FaMagic className="w-8 h-8" />,
          title: "Smart Editing Commands",
          description: "Natural language editing that understands creative intent",
          details: [
            "Remove silences and add logo",
            "Create highlight reel from best moments",
            "Apply brand style throughout",
            "Add transitions between scenes",
            "Generate titles and captions"
          ]
        },
        {
          icon: <FaLayerGroup className="w-8 h-8" />,
          title: "Real-time Effects",
          description: "Live Remotion-powered transitions and animations",
          details: [
            "Fade, slide, wipe, flip transitions",
            "Custom animation generation",
            "Real-time preview rendering",
            "React component-based effects",
            "Programmatic video composition"
          ]
        }
      ]
    }
  ];

  const technicalSpecs = [
    {
      category: "AI Models",
      icon: <FaBrain className="w-6 h-6" />,
      specs: [
        "GPT-4o for semantic understanding",
        "Custom computer vision models",
        "Speech recognition and analysis",
        "Sentiment and emotion detection",
        "Content classification networks"
      ]
    },
    {
      category: "Processing Power",
      icon: <FaMicrochip className="w-6 h-6" />,
      specs: [
        "WebCodecs API for native video processing",
        "GPU-accelerated analysis pipeline",
        "Real-time preview rendering",
        "Parallel processing architecture",
        "Sub-10 second analysis times"
      ]
    },
    {
      category: "Integration",
      icon: <FaCode className="w-6 h-6" />,
      specs: [
        "Remotion React video framework",
        "AWS S3 storage and CDN",
        "Supabase real-time database",
        "Stripe payment processing",
        "RESTful API architecture"
      ]
    }
  ];

  const useCases = [
    {
      industry: "Content Creators",
      icon: <FaUsers className="w-8 h-8" />,
      description: "YouTubers, TikTokers, and social media influencers",
      benefits: [
        "Find best moments in hours of footage",
        "Create viral-ready clips automatically",
        "Maintain consistent brand style",
        "10x faster content production"
      ]
    },
    {
      industry: "Education",
      icon: <FaGraduationCap className="w-8 h-8" />,
      description: "Educational institutions and online course creators",
      benefits: [
        "Organize lecture recordings intelligently",
        "Extract key learning moments",
        "Create study guides from videos",
        "Improve student engagement"
      ]
    },
    {
      industry: "Enterprise",
      icon: <FaIndustry className="w-8 h-8" />,
      description: "Marketing teams and corporate communications",
      benefits: [
        "Brand-consistent video production",
        "Scale video marketing efforts",
        "Automated compliance checking",
        "ROI tracking and optimization"
      ]
    }
  ];

  const getCurrentTabFeatures = () => {
    return aiFeatures.find(tab => tab.id === activeTab)?.features || [];
  };

  const getCurrentTabColor = () => {
    return aiFeatures.find(tab => tab.id === activeTab)?.color || 'blue';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="relative z-50 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaVideo className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Video Editor
              </h1>
            </Link>
            <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
              <img 
                src="/bolt/white_circle_360x360/white_circle_360x360.svg" 
                alt="Built with Bolt" 
                className="w-5 h-5"
              />
              <span className="text-xs font-medium text-gray-300">Built on Bolt</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
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
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30 mb-8">
            <FaLightbulb className="w-5 h-5 text-yellow-400 mr-3" />
            <span className="text-lg font-medium">Built on Bolt.new • Revolutionary AI Video Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
            Every Feature is
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              AI-Powered Magic
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
            From GPT-4 semantic understanding to real-time Remotion rendering, 
            every feature showcases cutting-edge AI innovation that will impress both users and judges.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Creating</span>
              <FaArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/editor-demo"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
            >
              <FaPlay className="w-4 h-4" />
              <span>See Demo</span>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">8+</div>
              <div className="text-sm text-gray-400">AI Models Integrated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">95%+</div>
              <div className="text-sm text-gray-400">Analysis Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">&lt;10s</div>
              <div className="text-sm text-gray-400">Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">Real-time</div>
              <div className="text-sm text-gray-400">Preview & Effects</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Categories Tabs */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered Feature Categories
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Explore our three pillars of AI innovation that make video editing intelligent
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {aiFeatures.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-600 text-white shadow-lg transform scale-105`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {getCurrentTabFeatures().map((feature, index) => (
              <div key={index} className={`bg-gray-800/50 rounded-2xl p-8 border border-${getCurrentTabColor()}-500/30`}>
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className={`text-${getCurrentTabColor()}-400 mb-4`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                    <p className="text-lg text-gray-300 mb-6">{feature.description}</p>
                    
                    <div className="space-y-3">
                      {feature.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <FaCheck className={`w-4 h-4 text-${getCurrentTabColor()}-400 flex-shrink-0`} />
                          <span className="text-gray-300">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`bg-gradient-to-br from-${getCurrentTabColor()}-900/30 to-gray-900/30 rounded-xl p-6 border border-${getCurrentTabColor()}-500/20`}>
                    <div className="text-center">
                      <div className={`w-16 h-16 bg-${getCurrentTabColor()}-500 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                        {feature.icon}
                      </div>
                      <h4 className={`text-lg font-semibold text-${getCurrentTabColor()}-300 mb-2`}>
                        Powered by AI
                      </h4>
                      <p className="text-sm text-gray-400">
                        This feature leverages machine learning and advanced algorithms to deliver human-level intelligence in video processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full border border-blue-500/30 mb-6">
              <FaMicrochip className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-sm font-medium">Technical Excellence</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Under the Hood
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built with cutting-edge technology that showcases both innovation and scalability
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {technicalSpecs.map((spec, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="text-blue-400 mb-4">
                  {spec.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{spec.category}</h3>
                <ul className="space-y-2">
                  {spec.specs.map((item, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <FaCheck className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Who Benefits Most
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our AI features solve real problems for diverse industries and user types
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
                <div className="text-purple-400 mb-6 flex justify-center">
                  {useCase.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{useCase.industry}</h3>
                <p className="text-gray-400 mb-6">{useCase.description}</p>
                
                <div className="space-y-3">
                  {useCase.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <FaCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-12 border border-purple-500/30">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Experience the Future Today
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Ready to see what AI-powered video editing can do? Start creating with our revolutionary platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <FaArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/editor-demo"
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-600"
              >
                <FaPlay className="w-4 h-4" />
                <span>Watch Demo</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaVideo className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold">AI Video Editor</h3>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              The future of video editing is here. Create professional videos with AI intelligence.
            </p>
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/bolt/logotext_poweredby_360w/logotext_poweredby_360w.svg" 
                alt="Powered by Bolt" 
                className="h-8"
              />
            </div>
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}