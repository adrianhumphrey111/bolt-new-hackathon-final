/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Increase API timeout and body size limits for large exports
  api: {
    responseLimit: '500mb',
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
  
  webpack: (config, { isServer }) => {
    // Ignore these modules during bundling for client-side
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    
    return config;
  },
  
};

module.exports = nextConfig;
