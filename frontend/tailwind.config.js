/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        logo: ['Silkscreen', 'monospace'],
      },
      // Palette sampled from the Figma file.
      colors: {
        brand: {
          50: '#ECF8F0',
          100: '#DDF2E4',
          200: '#B9E4C7',
          500: '#18A957',
          600: '#0FA34A',
          700: '#0B8A3E',
        },
        ink: {
          900: '#1E1E1E',
          700: '#3F3F46',
          500: '#71717A',
          400: '#9CA3AF',
          300: '#C4C7CC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F5F5',
          subtle: '#FAFAFA',
          line: '#EEEEEE',
        },
        pending: { bg: '#FFF1E6', text: '#E26F1E', line: '#FBD5B5' },
        sent: { bg: '#F1F1F1', text: '#5F6368' },
        danger: { bg: '#FDECEC', text: '#D93025' },
        highlight: { bg: '#FFF8DB', line: '#F4C430' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        popover: '0 12px 32px -8px rgba(16, 24, 40, 0.18), 0 2px 6px rgba(16, 24, 40, 0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
        'slide-up': 'slide-up 220ms ease-out both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
