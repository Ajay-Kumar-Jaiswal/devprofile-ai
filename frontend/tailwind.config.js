/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderColor: {
        DEFAULT: 'rgba(148, 163, 184, 0.16)',
        subtle: 'rgba(148, 163, 184, 0.16)',
      },
      opacity: {
        14: '0.14',
        16: '0.16',
        18: '0.18',
      },
      colors: {
        page: '#0B0D12',
        card: 'rgba(16, 23, 35, 0.60)',
        nested: 'rgba(20, 27, 40, 0.45)',
        input: 'rgba(16, 23, 35, 0.55)',
        border: 'rgba(148, 163, 184, 0.16)',
        navy: {
          950: '#0B0D12', // deep charcoal page background
          900: 'rgba(16, 23, 35, 0.60)', // main card background (glass)
          850: 'rgba(20, 27, 40, 0.50)', // nested panel background (glass)
          800: 'rgba(24, 33, 49, 0.55)', // elevated panel / hover
          750: 'rgba(30, 41, 59, 0.45)',
          700: 'rgba(148, 163, 184, 0.18)', // default border
          600: 'rgba(148, 163, 184, 0.22)',
        },
        slate: {
          900: 'rgba(16, 23, 35, 0.60)', // nested panel
          850: 'rgba(20, 27, 40, 0.50)', // card background
          800: 'rgba(148, 163, 184, 0.18)', // default border
          700: 'rgba(148, 163, 184, 0.22)', // subtle border
          600: '#63656C',
          500: '#7A7B82', // subtle text
          400: '#909198', // muted labels
          300: '#B3B3B8', // secondary text
          200: '#D6D6DB',
          100: '#F5F5F5', // near-white headings
        },
        neutral: {
          950: '#0B0D12',
          900: 'rgba(16, 23, 35, 0.60)',
          850: 'rgba(20, 27, 40, 0.50)',
          800: 'rgba(24, 33, 49, 0.55)',
          750: 'rgba(30, 41, 59, 0.45)',
          700: 'rgba(148, 163, 184, 0.18)',
          600: 'rgba(148, 163, 184, 0.22)',
          500: '#63656C',
          400: '#909198',
          300: '#B3B3B8',
          200: '#D6D6DB',
          100: '#F5F5F5',
          50: '#FAFAFA',
        },
        teal: {
          DEFAULT: '#79D8D4',
          accent: '#79D8D4',
          hover: '#477F7C',
          300: '#A4E8E5',
          400: '#79D8D4',
          500: '#5BC2BD',
          600: '#477F7C',
          700: '#356360',
          800: '#264A48',
          900: '#17302F',
          950: '#0E1F1E',
        },
        violet: {
          950: '#0F0B18',
          900: '#1B142B', // active violet background
          800: '#2E1E4F',
          700: '#4C2889',
          600: '#7C3AED',
          500: '#8B5CF6', // primary violet
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
          teal: '#79D8D4',
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
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'subtle-glow': '0 0 0 1px rgba(71, 127, 124, 0.25)',
        'glow-teal': '0 0 16px -2px rgba(121, 216, 212, 0.20)',
        'glow-violet': '0 0 16px -2px rgba(139, 92, 246, 0.20)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.35)',
        'card-hover': '0 0 0 1px rgba(124, 58, 237, 0.30), 0 8px 30px rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
