/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#3949ab',
          600: '#303f9f',
          700: '#283593',
          800: '#1B1F5E',
          900: '#0d0f2e',
          950: '#080a1a',
        },
        gold: {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#F5A623',
          600: '#e6951a',
          700: '#c87d0e',
          800: '#aa6508',
          900: '#7a4700',
        },
        magic: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#6C3FC5',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        /**
         * The surfaces and the foreground are the theme.
         *
         * `white` in this codebase never meant the colour — it meant the
         * foreground: text-white/50, border-white/10, bg-white/5 are "ink at
         * N%" over a dark ground, used about 1,100 times across 35 files.
         * Pointing it at a channel triple makes every one of those follow the
         * theme, opacity intact, without touching a single class name. The six
         * places that genuinely wanted white paper use `bg-paper`.
         *
         * `<alpha-value>` is what lets Tailwind keep the /50 modifiers working.
         */
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        paper: '#ffffff',
        dark: {
          900: 'rgb(var(--c-s900) / <alpha-value>)',
          800: 'rgb(var(--c-s800) / <alpha-value>)',
          700: 'rgb(var(--c-s700) / <alpha-value>)',
          600: 'rgb(var(--c-s600) / <alpha-value>)',
          500: 'rgb(var(--c-s500) / <alpha-value>)',
        },
      },
      fontFamily: {
        arabic: ['"Noto Kufi Arabic"', 'sans-serif'],
        sans: ['"Inter"', '"Noto Kufi Arabic"', 'sans-serif'],
        brand: ['"Cinzel Decorative"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        // These were fixed dark hexes, which in light mode painted a muddy
        // lavender wash over the whole hero. Routed through variables so each
        // theme supplies its own ground; the gold gradient is brand and stays.
        'magic-gradient': 'var(--g-magic)',
        'gold-gradient': 'linear-gradient(135deg, #F5A623 0%, #e6951a 100%)',
        'hero-radial': 'var(--g-hero)',
        'card-gradient': 'var(--g-card)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'page-flip': 'pageFlip 1.5s ease-in-out infinite',
        'star-twinkle': 'starTwinkle 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-15px) rotate(1deg)' },
          '66%': { transform: 'translateY(-8px) rotate(-1deg)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(245,166,35,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245,166,35,0.7)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pageFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(-20deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        starTwinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'gold-glow': '0 0 30px rgba(245,166,35,0.4)',
        'magic-glow': '0 0 30px rgba(108,63,197,0.5)',
        'card': '0 8px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 20px 50px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
