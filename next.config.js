/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    TAILWIND_DISABLE_NATIVE: 'true',
  },
};

module.exports = nextConfig;