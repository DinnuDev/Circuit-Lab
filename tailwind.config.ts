/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'circuit-bg': '#0f1117',
        'circuit-panel': '#1a1d27',
        'circuit-border': '#2a2d3e',
        'circuit-accent': '#3b82f6',
        'circuit-green': '#22c55e',
        'circuit-red': '#ef4444',
        'circuit-yellow': '#f59e0b',
        'circuit-orange': '#f97316',
        'wire-normal': '#22c55e',
        'wire-active': '#3b82f6',
        'wire-danger': '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
