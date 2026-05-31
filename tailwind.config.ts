import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Bharat brand palette
        saffron: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF9933', // primary
          600: '#FF6B00', // darker
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        'india-green': {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#138808', // primary
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        chakra: '#000080',
        // Dark bg system
        bg: {
          DEFAULT: '#06060A',
          2: '#0D0D15',
        },
        surface: {
          1: '#111118',
          2: '#18181F',
          3: '#1E1E28',
        },
        // Social platform colors
        instagram: '#E1306C',
        twitter:   '#1DA1F2',
        linkedin:  '#0077B5',
        youtube:   '#FF0000',
        facebook:  '#1877F2',
        whatsapp:  '#25D366',
      },
      backgroundImage: {
        'tricolor': 'linear-gradient(90deg, #FF9933 33.33%, #ffffff 33.33% 66.66%, #138808 66.66%)',
        'saffron-grad': 'linear-gradient(135deg, #FF9933, #FF6B00)',
        'india-grad': 'linear-gradient(135deg, #138808, #2ecc40)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%':   { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(40px, 30px) scale(1.08)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease infinite',
        fadeUp:  'fadeUp 0.4s ease both',
        drift:   'drift 18s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}

export default config
