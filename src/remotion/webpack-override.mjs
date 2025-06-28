/**
 *  @param {import('webpack').Configuration} currentConfig
 */
export const webpackOverride = (currentConfig) => {
  // Disable native addons for WebContainer compatibility
  currentConfig.resolve = currentConfig.resolve || {};
  currentConfig.resolve.fallback = {
    ...currentConfig.resolve.fallback,
    fs: false,
    net: false,
    tls: false,
    crypto: false,
  };

  // Optimize for WebContainer memory constraints
  currentConfig.optimization = {
    ...currentConfig.optimization,
    splitChunks: {
      chunks: 'all',
      maxSize: 244000, // Smaller chunks for WebContainer
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  };

  return currentConfig;
};