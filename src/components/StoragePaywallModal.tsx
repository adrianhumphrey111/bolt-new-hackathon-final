'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiX, FiHardDrive, FiArrowRight } from 'react-icons/fi';

interface StoragePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStorageGB: number;
  storageLimit: number;
  fileSize: number; // in bytes
}

export function StoragePaywallModal({
  isOpen,
  onClose,
  currentStorageGB,
  storageLimit,
  fileSize
}: StoragePaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  const totalAfterUpload = currentStorageGB + fileSizeGB;

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FiHardDrive className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Storage Limit Reached</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              Your upload would exceed your storage limit:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current storage:</span>
                <span className="font-medium">{currentStorageGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File size:</span>
                <span className="font-medium">{fileSizeGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total after upload:</span>
                <span className="font-bold text-orange-600">{totalAfterUpload.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your limit:</span>
                <span className="font-medium">{storageLimit} GB</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Upgrade to Pro</h3>
            <ul className="text-sm text-blue-800 space-y-1 mb-3">
              <li>• 50 GB storage (25x more space)</li>
              <li>• 1,000 credits per month</li>
              <li>• Priority support</li>
              <li>• Advanced features</li>
            </ul>
            <p className="text-sm text-blue-700">
              <span className="font-medium">$100/month</span> or <span className="font-medium">$85/month annually</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Upgrade Now
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}