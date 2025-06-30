'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiZap } from 'react-icons/fi';

interface Credits {
  total: number;
  used: number;
  available: number;
  resetDate: string | null;
}

interface CreditDisplayProps {
  className?: string;
}

export function CreditDisplay({ className = '' }: CreditDisplayProps) {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FiZap className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  const percentage = credits.total > 0 
    ? Math.round((credits.available / credits.total) * 100)
    : 0;

  const isLow = percentage < 20;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <FiZap className={`w-4 h-4 ${isLow ? 'text-red-500' : 'text-yellow-500'}`} />
        <span className={`text-sm font-medium ${isLow ? 'text-red-500' : 'text-gray-300'}`}>
          {credits.available} credits
        </span>
      </div>
      
      {isLow && (
        <button
          onClick={() => router.push('/billing')}
          className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
        >
          Top up
        </button>
      )}
    </div>
  );
}

// Hook for use in other components
export function useCredits() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb-access-token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      setCredits(data.credits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
      setCredits(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  return { credits, loading, error, refetch: fetchCredits };
}