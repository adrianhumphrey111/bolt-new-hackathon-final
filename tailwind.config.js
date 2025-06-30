/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/remotion/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        'unfocused-border-color': 'var(--unfocused-border-color)',
        'focused-border-color': 'var(--focused-border-color)',
        'button-disabled-color': 'var(--button-disabled-color)',
        'disabled-text-color': 'var(--disabled-text-color)',
        'geist-error': 'var(--geist-error)',
        subtitle: 'var(--subtitle)',
      },
      padding: {
        'geist-quarter': 'var(--geist-quarter-pad)',
        'geist-half': 'var(--geist-half-pad)',
        geist: 'var(--geist-pad)',
      },
      spacing: {
        geist: 'var(--geist-pad)',
        'geist-half': 'var(--geist-half-pad)',
        'geist-quarter': 'var(--geist-quarter-pad)',
      },
      borderRadius: {
        geist: 'var(--geist-border-radius)',
      },
      fontFamily: {
        geist: 'var(--geist-font)',
      },
      animation: {
        spinner: 'spinner 1.2s linear infinite',
      },
      keyframes: {
        spinner: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.15' },
        },
      },
    },
  },
  plugins: [],
}