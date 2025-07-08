'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaTimes } from 'react-icons/fa';

interface TrialBannerProps {
  trialEndsAt: string;
  onUpgrade?: () => void;
}

export default function TrialBanner({ trialEndsAt, onUpgrade }: TrialBannerProps) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const calculateDaysLeft = () => {
      const now = new Date();
      const endDate = new Date(trialEndsAt);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysLeft(Math.max(0, diffDays));
    };

    calculateDaysLeft();
    
    // Update every hour
    const interval = setInterval(calculateDaysLeft, 1000 * 60 * 60);
    
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  if (!isVisible || daysLeft <= 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg">
      <div className="flex items-center space-x-2">
        <FaClock className="w-4 h-4" />
        <span className="font-medium">
          Pro Trial: {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
        </span>
      </div>
      
      <div className="flex items-center space-x-3">
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-white hover:text-gray-200 underline font-medium transition-colors"
          >
            Upgrade now
          </button>
        )}
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Dismiss banner"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}