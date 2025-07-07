'use client';

import { useAuthContext } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signIn, signInWithOAuth, isAuthenticated, loading } = useAuthContext();

  // Check for callback errors and redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
    
    // Check for URL parameters (errors and success messages)
    const searchParams = new URLSearchParams(window.location.search);
    const callbackError = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (callbackError === 'callback_error') {
      setError(message ? decodeURIComponent(message) : 'OAuth callback failed. Please try again.');
    } else if (message) {
      // Handle success messages (like password reset confirmation)
      setSuccessMessage(decodeURIComponent(message));
    }
  }, [isAuthenticated, loading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // Validate inputs before sending
      if (!email.trim() || !password) {
        setError('Email and password are required');
        return;
      }

      const result = await signIn(email.trim(), password);

      if (result.success) {
        // Successful login - redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await signInWithOAuth(provider);
      if (!result.success) {
        setError(result.error || 'OAuth login failed');
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
    <div className="min-h-screen bg-gray-900 py-12 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Sign in to your account
          </h1>
          <p className="text-gray-400">
            Start creating amazing videos with Remotion
          </p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-600 text-white p-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
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
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">Or continue with</span>
            <div className="flex-1 h-px bg-gray-600"></div>
          </div>

          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            <FaGoogle /> Continue with Google
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
        
        <p className="text-center mt-2 text-gray-400">
          <Link href="/auth/forgot-password" className="text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}