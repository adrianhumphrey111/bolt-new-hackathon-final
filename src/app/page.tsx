'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPlay, FaEdit, FaShare } from 'react-icons/fa';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

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
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        
        {/* Navigation */}
        <nav className="relative z-10 px-4 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Remotion Video Editor
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Create Amazing Videos with
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Remotion Timeline
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional video editing powered by React and Remotion. Build interactive timelines, 
            edit with precision, and create stunning videos with the tools you already know.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>Start Creating</span>
            </Link>
            <Link
              href="/editor"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <FaPlay />
              <span>Try Demo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            Powerful Features for Video Creators
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
                <FaEdit className="text-2xl text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white">Professional Timeline</h4>
              <p className="text-gray-400">
                Drag-and-drop editing with trim, split, and resize tools. 
                Undo/redo support and keyboard shortcuts for efficient workflow.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto">
                <FaPlay className="text-2xl text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white">Real-time Preview</h4>
              <p className="text-gray-400">
                See your changes instantly with our Remotion-powered player. 
                Smooth playback and precise frame control.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto">
                <FaShare className="text-2xl text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white">Export & Share</h4>
              <p className="text-gray-400">
                Export high-quality videos in multiple formats. 
                Cloud storage integration for easy sharing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Start Creating?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who are already using our platform to create amazing videos.
          </p>
          <Link
            href="/auth/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <span>Get Started for Free</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 Remotion Video Editor. Built with React and Remotion.
          </p>
        </div>
      </footer>
    </div>
  );
}
