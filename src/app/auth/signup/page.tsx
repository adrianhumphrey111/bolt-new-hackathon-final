'use client';

import { useAuthContext } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import Link from 'next/link';
import TrialPaywall from '@/components/TrialPaywall';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTrialPaywall, setShowTrialPaywall] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const router = useRouter();
  const { signUp, signInWithOAuth, isAuthenticated, loading } = useAuthContext();

  // Redirect if already authenticated (but not if we're showing trial paywall)
  useEffect(() => {
    if (!loading && isAuthenticated && !showTrialPaywall) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router, showTrialPaywall]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      // Validate inputs
      if (!email.trim() || !password || !confirmPassword) {
        setError('All fields are required');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      const result = await signUp(email.trim(), password);

      if (result.success) {
        console.log('✅ Signup successful, user is authenticated');
        // Show trial paywall immediately since user is now authenticated
        setSignupEmail(email.trim());
        setShowTrialPaywall(true);
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const result = await signInWithOAuth(provider);
      if (!result.success) {
        setError(result.error || 'OAuth login failed');
      } else {
        // For OAuth, we'll need to handle the trial flow in the callback
        // The callback route should check if user is new and redirect to trial
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Show loading while checking auth state
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
    <>
      {showTrialPaywall && (
        <TrialPaywall 
          userEmail={signupEmail}
          onClose={() => {
            setShowTrialPaywall(false);
            // Let the useEffect handle the redirect
          }}
        />
      )}
      
      <div className="min-h-screen bg-gray-900 py-12 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Create your account
          </h1>
          <p className="text-gray-400">
            Join us and start creating amazing videos
          </p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-600 text-white p-3 rounded mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>

        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
            >
              <FaGoogle className="h-5 w-5" />
              <span className="ml-2">Continue with Google</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}