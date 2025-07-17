/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
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
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			}
  		},
  		padding: {
  			'geist-quarter': 'var(--geist-quarter-pad)',
  			'geist-half': 'var(--geist-half-pad)',
  			geist: 'var(--geist-pad)'
  		},
  		spacing: {
  			geist: 'var(--geist-pad)',
  			'geist-half': 'var(--geist-half-pad)',
  			'geist-quarter': 'var(--geist-quarter-pad)'
  		},
  		borderRadius: {
  			geist: 'var(--geist-border-radius)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			geist: 'var(--geist-font)'
  		},
  		animation: {
  			spinner: 'spinner 1.2s linear infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		keyframes: {
  			spinner: {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0.15'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		}
  	}
  },
  plugins: [],
}