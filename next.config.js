/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Exclude platform-specific Remotion compositor packages from webpack bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude all platform-specific compositor packages
      config.externals = config.externals || {};
      config.externals['@remotion/compositor-win32-x64-msvc'] = 'commonjs @remotion/compositor-win32-x64-msvc';
      config.externals['@remotion/compositor-win32-arm64-msvc'] = 'commonjs @remotion/compositor-win32-arm64-msvc';
      config.externals['@remotion/compositor-linux-x64-gnu'] = 'commonjs @remotion/compositor-linux-x64-gnu';
      config.externals['@remotion/compositor-linux-arm64-gnu'] = 'commonjs @remotion/compositor-linux-arm64-gnu';
      config.externals['@remotion/compositor-darwin-x64'] = 'commonjs @remotion/compositor-darwin-x64';
      config.externals['@remotion/compositor-darwin-arm64'] = 'commonjs @remotion/compositor-darwin-arm64';
    }
    
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
