/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-icons', '@remotion/transitions'],
  experimental: {
    // Remove any experimental features that might not be compatible with Next.js 14
  },
  webpack: (config, { isServer }) => {
    // Disable native addons and optimize for WebContainer
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Optimize for WebContainer memory constraints
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },
};

module.exports = nextConfig;