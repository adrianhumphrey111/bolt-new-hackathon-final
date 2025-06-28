const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Force disable native engine in PostCSS context
      engine: process.env.TAILWIND_DISABLE_NATIVE === 'true' ? 'js' : undefined
    },
  },
};
export default config;