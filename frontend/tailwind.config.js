/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: '#080B12',
        card: '#111A2B',
        nested: '#0B1220',
        border: '#2A3850',
        navy: {
          950: '#080B12',
          900: '#0B1220',
          850: '#111A2B',
          800: '#17243B',
          750: '#1E2F4C',
          700: '#2A3850',
          600: '#3A4C6B',
        },
        slate: {
          900: '#0B1220',
          800: '#2A3850',
          700: '#3A4C6B',
          600: '#536685',
          500: '#8D9CB2',
          400: '#B0BDD0',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
        },
        violet: {
          950: '#150E28',
          900: '#251942',
          800: '#3B2368',
          700: '#6D28D9',
          600: '#7C3AED',
          500: '#8B5CF6',
          400: '#A78BFA',
          300: '#C4B5FD',
          200: '#DDD6FE',
          100: '#EDE9FE',
        },
        emerald: {
          500: '#34D399',
          400: '#34D399',
          300: '#6EE7B7',
        },
        amber: {
          500: '#FBBF24',
          400: '#FBBF24',
          300: '#FDE68A',
        },
        rose: {
          500: '#F87171',
          400: '#F87171',
          300: '#FCA5A5',
        },
        accent: {
          violet: '#8B5CF6',
          purple: '#A78BFA',
          blue: '#60A5FA',
          cyan: '#38BDF8',
          emerald: '#34D399',
          amber: '#FBBF24',
          rose: '#F87171',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        'glow-violet': '0 0 20px -2px rgba(139, 92, 246, 0.28)',
        'glow-blue': '0 0 20px -2px rgba(96, 165, 250, 0.25)',
        'glow-emerald': '0 0 20px -2px rgba(52, 211, 153, 0.25)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 1px 1px rgba(255, 255, 255, 0.06)',
        'card-hover': '0 10px 25px -4px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(139, 92, 246, 0.15)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
