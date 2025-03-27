/** @type {import('@tailwindcss/postcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Refined color palette for a more premium feel
        astro: {
          bg: {
            primary: '#0F172A',    // Deep indigo background
            secondary: '#1E293B',  // Secondary background
            tertiary: '#334155',   // Tertiary background
            card: '#1E293B',       // Card background
            accent: '#0F1A2A',     // Accent background
          },
          accent: {
            primary: '#B28F4C',    // Gold primary accent
            secondary: '#D5B475',  // Light gold secondary accent
            tertiary: '#8A6D35',   // Deep gold tertiary accent
            indigo: '#6366F1',     // Indigo accent for contrast
            blue: '#38BDF8',       // Celestial blue accent
          },
          text: {
            primary: '#F1F5F9',    // Primary text - softer white
            secondary: '#CBD5E1',  // Secondary text
            muted: '#94A3B8',      // Muted text
            accent: '#E2C886',     // Gold accent text
          },
          border: {
            light: '#334155',      // Light border
            focus: '#B28F4C',      // Focus border
          }
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
      },
      fontSize: {
        // Improved typography scale
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5715' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.25' }],
      },
      boxShadow: {
        'astro-sm': '0 1px 3px rgba(0, 0, 0, 0.14), 0 1px 2px rgba(0, 0, 0, 0.12)',
        'astro-md': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'astro-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'astro-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'astro-focus': '0 0 0 2px rgba(178, 143, 76, 0.4)',
        'astro-glow': '0 0 15px rgba(178, 143, 76, 0.4)',
        'astro-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      backgroundImage: {
        'astro-gradient': 'linear-gradient(135deg, #B28F4C, #D5B475)',
        'astro-gradient-dark': 'linear-gradient(135deg, #0F172A, #1E293B)',
        'cosmic-gradient': 'linear-gradient(135deg, #0F172A, #1E1E38)',
        'cosmic-glow': 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15), rgba(15, 23, 42, 0) 70%)',
        'star-pattern': 'url("/images/star-pattern.svg")',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'rotate-slow': 'rotate 60s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 0.5 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
    },
  },
  plugins: [],
}
