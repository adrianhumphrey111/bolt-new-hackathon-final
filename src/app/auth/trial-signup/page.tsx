'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TrialPaywall from '@/components/TrialPaywall';
import { useRouter } from 'next/navigation';

export default function TrialSignup() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setUserEmail(decodeURIComponent(email));
    } else {
      // If no email, redirect to signup
      router.push('/auth/signup');
    }
  }, [searchParams, router]);

  if (!userEmail) {
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
    <TrialPaywall 
      userEmail={userEmail}
      onClose={() => router.push('/dashboard')}
    />
  );
}