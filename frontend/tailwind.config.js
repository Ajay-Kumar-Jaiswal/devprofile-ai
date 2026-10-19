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
        navy: {
          950: '#070a13',
          900: '#0b1120',
          850: '#0f172a',
          800: '#151f38',
          750: '#1b2746',
          700: '#223157',
          600: '#2d4073',
        },
        accent: {
          violet: '#8b5cf6',
          purple: '#a855f7',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(255, 255, 255, 0.04)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.25)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.25)',
        'card': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
