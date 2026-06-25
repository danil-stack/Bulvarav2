/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './scr/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0A0D12',
          deep: '#06070A',
        },
        surface: {
          DEFAULT: '#12161F',
          raised: '#1A2030',
          line: '#262E42',
        },
        // Stat colors — each stat owns a hue across the whole app
        strength: '#FF5252',
        mass: '#7CFF5C',
        stamina: '#FFC53D',
        genetics: '#C26BFF',
        // Blockchain / currency accent (nods to TON blue)
        bulv: '#36C5F0',
        ton: '#0098EA',
        legend: '#FFD23E',
      },
      fontFamily: {
        display: ['"Russo One"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neon-mass': '0 0 12px 0 rgba(124,255,92,0.45)',
        'neon-strength': '0 0 12px 0 rgba(255,82,82,0.45)',
        'neon-stamina': '0 0 12px 0 rgba(255,197,61,0.45)',
        'neon-genetics': '0 0 12px 0 rgba(194,107,255,0.45)',
        'neon-bulv': '0 0 16px 0 rgba(54,197,240,0.5)',
        'card': '0 4px 24px -4px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(0.9)', opacity: '0' },
          '15%': { transform: 'translateY(-4px) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateY(-46px) scale(1)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float-up': 'float-up 1.1s ease-out forwards',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 6s linear infinite',
        'pop-in': 'pop-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
    },
  },
  plugins: [],
};
