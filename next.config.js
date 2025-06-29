/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-icons', '@remotion/transitions'],
  env: {
    TAILWIND_DISABLE_NATIVE: 'true',
  },
  experimental: {
    // Disable SWC minifier in favor of Terser for better WebContainer compatibility
    swcMinify: false,
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