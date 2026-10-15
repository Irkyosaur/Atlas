/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          orange: 'var(--ed-orange-primary)',
          bright: 'var(--ed-orange-bright)',
          dim: 'var(--ed-orange-dim)',
          glow: 'var(--ed-orange-glow)',
          space: 'var(--ed-space-black)',
          panel: 'var(--ed-bg-panel)',
          panelDark: 'var(--ed-bg-panel-dark)',
          grid: 'var(--ed-grid-line)',
          axis: 'var(--ed-grid-axis)',
          cyan: 'var(--ed-blue-cyan)',
          green: 'var(--ed-green-ax)',
          hazard: 'var(--ed-red-hazard)',
          warn: 'var(--ed-yellow-warn)',
          purple: 'var(--ed-purple-permit)',
        },
      },
      fontFamily: {
        sans: ['Eurostile', 'Orbitron', 'Exo 2', 'Rajdhani', '-apple-system', 'sans-serif'],
        mono: ['Rajdhani', 'monospace'],
      },
      boxShadow: {
        'hud-glow': '0 0 15px rgba(255, 113, 0, 0.35)',
        'hud-glow-lg': '0 0 25px rgba(255, 113, 0, 0.5)',
        'hud-glow-cyan': '0 0 15px rgba(79, 195, 247, 0.4)',
      },
    },
  },
  plugins: [],
};
