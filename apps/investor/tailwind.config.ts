// apps/investor/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        nexus: {
          bg:     '#09090B',
          bg2:    '#0F1012',
          bg3:    '#141618',
          bg4:    '#1A1C20',
          text:   '#EDEAE3',
          muted:  '#7A7873',
          hint:   '#3D3C3A',
          gold:   '#BFA063',
          gold2:  '#D4B57A',
          teal:   '#2CC89A',
          red:    '#E05555',
          blue:   '#5B9CF6',
          purple: '#9D8DF7',
          amber:  '#E8A030',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.5' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease',
        pulse:  'pulse 2s infinite',
      },
    },
  },
  plugins: [],
}

export default config
