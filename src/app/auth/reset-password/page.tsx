'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters long', test: (pwd) => pwd.length >= 8, met: password.length >= 8 },
    { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd), met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd), met: /[a-z]/.test(password) },
    { label: 'Contains number', test: (pwd) => /\d/.test(pwd), met: /\d/.test(password) },
    { label: 'Contains special character (!@#$%^&*)', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  // Check if we have a valid reset session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        if (session?.user?.email) {
          setIsValidSession(true);
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (error) {
        console.error('Session validation error:', error);
        setError('Unable to validate reset link. Please try again.');
      }
    };

    checkSession();
  }, [supabase]);

  // Real-time password validation
  useEffect(() => {
    if (confirmPassword.length > 0) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  const validatePassword = () => {
    const allRequirementsMet = passwordRequirements.every(req => req.test(password));
    
    if (!allRequirementsMet) {
      setError('Password does not meet all security requirements');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const getPasswordStrength = () => {
    const metRequirements = passwordRequirements.filter(req => req.met).length;
    if (metRequirements <= 2) return { strength: 'Weak', color: 'bg-red-500' };
    if (metRequirements <= 4) return { strength: 'Medium', color: 'bg-yellow-500' };
    return { strength: 'Strong', color: 'bg-green-500' };
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        // Sign out the user and redirect to login after a short delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.push('/auth/login?message=Password updated successfully. Please sign in with your new password.');
        }, 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Validating reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Create new password
          </h1>
          <p className="text-gray-400">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
            {error.includes('Invalid or expired') && (
              <div className="mt-2">
                <Link href="/auth/forgot-password" className="underline">
                  Request a new reset link
                </Link>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="bg-green-600 text-white p-3 rounded mb-4">
            {message}
          </div>
        )}

        {isValidSession && !message && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                required
                minLength={8}
                placeholder="Enter new password"
              />
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                required
                minLength={8}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-gray-400">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}