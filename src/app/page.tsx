'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Play, Clock, Upload, Zap, CheckCircle, Star } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
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

  const handleEmailSignup = () => {
    if (email) {
      router.push(`/auth/signup?email=${encodeURIComponent(email)}`);
    }
  };

  const testimonials = [
    {
      name: "Jake Martinez",
      role: "YouTube Creator",
      subscribers: "847K Subscribers",
      quote: "The AI agent is scary good. It understands my content style and makes cuts I would make myself. Saved me 4 hours on my last video.",
      timeSaved: "4 hours per video"
    },
    {
      name: "Sarah Kim",
      role: "Podcast Producer", 
      company: "TechTalk Weekly",
      quote: "Finally, an AI that gets the 0-80% problem. The latest LLMs understand context and flow. My rough drafts are publication-ready.",
      timeSaved: "6 hours per episode"
    },
    {
      name: "Marcus Chen",
      role: "Marketing Director",
      company: "SaaS Startup",
      quote: "This agentic AI is like having a skilled editor who works 24/7. We scaled from 1 to 5 videos per week effortlessly.",
      timeSaved: "15 hours per week"
    }
  ];

  const creatorLogos = [
    { name: "TechTalk Weekly", initials: "TW" },
    { name: "Creator Studio", initials: "CS" },
    { name: "Podcast Pro", initials: "PP" },
    { name: "Video Labs", initials: "VL" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">Tailored Labs</div>
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
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                Blog
              </Link>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-all"
              >
                {user ? "Dashboard" : "Start 7-Day Free Trial"}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-full border border-gray-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">127 creators joined this week</span>
            </div>

            {/* Social Proof Logos */}
            <div className="flex items-center justify-center space-x-6 mb-8">
              <span className="text-sm text-gray-500">Trusted by:</span>
              {creatorLogos.map((logo, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold">
                    {logo.initials}
                  </div>
                  <span className="text-xs text-gray-600">{logo.name}</span>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
                AI Agent Edits Your Video
                <br />
                <span className="text-white">From 0-80% in 4 Minutes</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Powered by agentic AI and latest LLMs like GPT-4. Upload raw footage, get a polished rough draft. Perfect for creators who hate timeline editing.
              </p>

              {/* Direct CTA */}
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-4 text-center">Start Your 7-Day Free Trial</h3>
                <Link
                  href={user ? "/dashboard" : "/auth/signup"}
                  className="w-full bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  ✓ Credit card required after 7 days ✓ All Pro features included ✓ Cancel anytime
                </p>
              </div>

              {/* Secondary CTA */}
              <div className="pt-4">
                <Link 
                  href="/demo" 
                  className="text-gray-400 hover:text-white transition-colors inline-flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Watch 2-minute demo</span>
                </Link>
              </div>
            </div>

            {/* Urgency */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 max-w-lg mx-auto">
              <p className="text-sm text-gray-300">
                <strong>Limited Time:</strong> Free trial includes priority processing and all Pro features
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Visual Demo */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              From Upload to Edited Video in 3 Steps
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              No complex software to learn. No hours of manual editing. Just professional results in minutes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-700 transition-colors duration-200">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">1. Upload Raw Footage</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">Drag & drop your video files - interviews, B-roll, screen recordings</p>
              <div className="text-sm text-gray-500 font-medium">Example: 45 min podcast recording</div>
            </div>

            <div className="text-center group">
              <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-700 transition-colors duration-200">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">2. AI Agent Analyzes & Edits</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">GPT-4 powered agent removes silence, detects scenes, and makes intelligent cuts</p>
              <div className="text-sm text-gray-500 font-medium">Processing time: ~4 minutes</div>
            </div>

            <div className="text-center group">
              <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-700 transition-colors duration-200">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Download Your Rough Draft</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">Professional video ready to publish or refine further</p>
              <div className="text-sm text-gray-500 font-medium">Result: 28 min polished video</div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-lg mx-auto">
              <p className="text-gray-300 font-bold text-lg mb-2">Agentic AI does 80% of editing work</p>
              <p className="text-sm text-gray-400">Latest LLMs understand your content and make smart decisions</p>
            </div>
          </div>

          {/* Inline CTA */}
          <div className="mt-12 text-center">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4">Ready to try it yourself?</h3>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all inline-flex items-center space-x-2"
              >
                <span>Start 7-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-gray-500 mt-2">Credit card required after 7 days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-full border border-gray-700 mb-6">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Real results from real creators</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              "This saves me hours every week"
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Creators are scaling their content production by focusing on creativity instead of tedious editing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-900 rounded-xl p-6 border border-gray-800 relative">
                {/* Time Saved Badge */}
                <div className="absolute -top-3 -right-3 bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-bold">
                  ⏱️ Saves {testimonial.timeSaved}
                </div>
                
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-300 mb-4 leading-relaxed">"{testimonial.quote}"</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                    <div className="text-sm text-gray-400">{testimonial.subscribers || testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof Summary */}
          <div className="mt-12 text-center">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold text-gray-300 mb-6">Average Creator Results</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="text-4xl font-bold text-white mb-2">4.2 hours</div>
                  <div className="text-sm text-gray-500">Time saved per video</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white mb-2">5x faster</div>
                  <div className="text-sm text-gray-500">Content production</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white mb-2">0 skills</div>
                  <div className="text-sm text-gray-500">Editing experience needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Simple Pricing, No Surprises
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Start with 7 days free, then choose the plan that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Trial */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold mb-4">7-Day Free Trial</h3>
              <div className="text-4xl font-bold mb-6">$0</div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Unlimited videos for 7 days</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">All Pro features included</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Priority processing</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Credit card required after trial</span>
                </li>
              </ul>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-semibold transition-colors flex items-center justify-center"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gray-900 rounded-2xl p-8 border-2 border-white relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <div className="text-4xl font-bold mb-6">$50<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Unlimited videos</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Priority processing</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Advanced AI commands</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">All export formats</span>
                </li>
              </ul>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="w-full bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Team Plan */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold mb-4">Team</h3>
              <div className="text-4xl font-bold mb-6">$200<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Everything in Pro</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">5 team members</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Shared brand templates</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Priority support</span>
                </li>
              </ul>
              <Link
                href={user ? "/dashboard" : "/auth/signup"}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-semibold transition-colors flex items-center justify-center"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Money-Back Guarantee */}
          <div className="mt-12 text-center">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold text-gray-300 mb-4">30-Day Money-Back Guarantee</h3>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                Try risk-free for 7 days, then if you're not completely satisfied within 30 days, we'll refund every penny. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            Ready to 10x Your Content Creation?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join 1,000+ creators who've already transformed their workflow. Start your free trial today.
          </p>
          
          {/* Final CTA */}
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 max-w-lg mx-auto mb-6">
            <Link
              href={user ? "/dashboard" : "/auth/signup"}
              className="w-full bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-gray-500 mt-3 text-center">
              ✓ 7-day free trial ✓ Credit card required after trial ✓ Cancel anytime
            </p>
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
              href={user ? "/dashboard" : "/auth/signup"}
              className="mt-4 md:mt-0 bg-white text-black px-6 py-2 rounded-full hover:bg-gray-200 transition-all"
            >
              {user ? "Dashboard" : "Start Free Trial"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}