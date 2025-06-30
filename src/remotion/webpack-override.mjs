/**
 *  @param {import('webpack').Configuration} currentConfig
 */
export const webpackOverride = (currentConfig) => {
  // Remove Tailwind v4 configuration since we're using v3
  return currentConfig;
};