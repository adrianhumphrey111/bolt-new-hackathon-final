'use client';

import { useState } from 'react';
import { generateUTMLink, getTrackingURLs, UTMParams } from '../lib/utm-generator';

export function UTMTrackingGenerator() {
  const [baseUrl, setBaseUrl] = useState('https://tailorlabsai.com');
  const [utmParams, setUtmParams] = useState<UTMParams>({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  });
  const [generatedUrl, setGeneratedUrl] = useState('');

  const presetCampaigns = getTrackingURLs(baseUrl);

  const generateUrl = () => {
    if (utmParams.utm_source && utmParams.utm_medium && utmParams.utm_campaign) {
      const url = generateUTMLink(baseUrl, utmParams);
      setGeneratedUrl(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6">UTM Tracking URL Generator</h2>
      
      {/* Quick Preset URLs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">🚀 Ready-to-Use Tracking URLs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Hunt URLs */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-400 mb-3">Product Hunt</h4>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-gray-300">Main page:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={presetCampaigns.productHunt.main}
                    readOnly 
                    className="flex-1 text-xs bg-gray-600 text-white p-2 rounded"
                  />
                  <button 
                    onClick={() => copyToClipboard(presetCampaigns.productHunt.main)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300">Signup page:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={presetCampaigns.productHunt.signup}
                    readOnly 
                    className="flex-1 text-xs bg-gray-600 text-white p-2 rounded"
                  />
                  <button 
                    onClick={() => copyToClipboard(presetCampaigns.productHunt.signup)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reddit URLs */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-3">Reddit</h4>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-gray-300">r/entrepreneur:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={presetCampaigns.reddit.entrepreneurMain}
                    readOnly 
                    className="flex-1 text-xs bg-gray-600 text-white p-2 rounded"
                  />
                  <button 
                    onClick={() => copyToClipboard(presetCampaigns.reddit.entrepreneurMain)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300">r/VideoEditing:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={presetCampaigns.reddit.videoEditingMain}
                    readOnly 
                    className="flex-1 text-xs bg-gray-600 text-white p-2 rounded"
                  />
                  <button 
                    onClick={() => copyToClipboard(presetCampaigns.reddit.videoEditingMain)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300">Signup page:</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={presetCampaigns.reddit.signup}
                    readOnly 
                    className="flex-1 text-xs bg-gray-600 text-white p-2 rounded"
                  />
                  <button 
                    onClick={() => copyToClipboard(presetCampaigns.reddit.signup)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom URL Generator */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">🛠️ Custom URL Generator</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="https://tailorlabsai.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Source (required)</label>
            <input
              type="text"
              value={utmParams.utm_source}
              onChange={(e) => setUtmParams({...utmParams, utm_source: e.target.value})}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="producthunt, reddit, twitter, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Medium (required)</label>
            <input
              type="text"
              value={utmParams.utm_medium}
              onChange={(e) => setUtmParams({...utmParams, utm_medium: e.target.value})}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="social, email, cpc, referral, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign (required)</label>
            <input
              type="text"
              value={utmParams.utm_campaign}
              onChange={(e) => setUtmParams({...utmParams, utm_campaign: e.target.value})}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="launch, beta, feature_announcement, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Term (optional)</label>
            <input
              type="text"
              value={utmParams.utm_term || ''}
              onChange={(e) => setUtmParams({...utmParams, utm_term: e.target.value})}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="keyword, target audience, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Content (optional)</label>
            <input
              type="text"
              value={utmParams.utm_content || ''}
              onChange={(e) => setUtmParams({...utmParams, utm_content: e.target.value})}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              placeholder="ad_variant, post_type, etc."
            />
          </div>
        </div>
        
        <button
          onClick={generateUrl}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Generate URL
        </button>
        
        {generatedUrl && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Generated URL:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedUrl}
                readOnly
                className="flex-1 p-2 bg-gray-700 text-white rounded border border-gray-600"
              />
              <button
                onClick={() => copyToClipboard(generatedUrl)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-600">
        <h4 className="font-semibold text-blue-400 mb-2">📋 How to Use These URLs</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Use the ready-to-use URLs in your Product Hunt launch and Reddit posts</li>
          <li>• Replace your existing links with these tracking URLs</li>
          <li>• Check Google Analytics → Acquisition → All Traffic → Source/Medium to see results</li>
          <li>• UTM parameters will also appear in console logs during signup/conversion</li>
        </ul>
      </div>
    </div>
  );
}