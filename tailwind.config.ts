import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f4f7fb',
        muted: '#a7b0bf',
        canvas: '#070a0f',
        panel: '#0d121a',
        panelSoft: '#131b26',
        grid: '#263241',
        profit: '#2fea7b',
        loss: '#ff5268',
        warning: '#f6c34a',
        info: '#4fb6ff'
      },
      boxShadow: {
        soft: '0 18px 48px rgba(0, 0, 0, 0.34)',
        focus: '0 0 0 3px rgba(47, 234, 123, 0.22)'
      }
    }
  },
  plugins: []
};

export default config;
