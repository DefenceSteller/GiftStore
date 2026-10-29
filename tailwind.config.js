/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.{html,js}', './src/**/*.{css,html}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0D0D12', soft: '#17171F', mute: '#5B5B6B', faint: '#8A8A99' },
        paper: '#FFFDF7',
        mist: '#F4F1E8',
        iris: { DEFAULT: '#7C5CFF', deep: '#5B3DF5', light: '#B7A6FF' },
        acid: '#D6FF3E',
        coral: '#FF6B5E',
        aqua: '#7CE7FF',
        butter: '#FFD84D',
        bubble: '#FF9BE1'
      },
      // Extra opacity steps used by the design system (border-ink/8, /12, divide-ink/6 …)
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Segoe UI"', 'Arial', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace']
      },
      boxShadow: {
        sticker: '6px 6px 0 #0D0D12',
        'sticker-sm': '3px 3px 0 #0D0D12',
        'sticker-iris': '6px 6px 0 #7C5CFF',
        soft: '0 16px 44px -18px rgba(13, 13, 18, 0.3)',
        lift: '0 24px 60px -24px rgba(13, 13, 18, 0.4)'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-14px) rotate(var(--r, 0deg))' }
        },
        pop: {
          '0%': { transform: 'scale(.85)', opacity: '0' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' }
        },
        blip: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.6)', opacity: '.35' }
        }
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'marquee-fast': 'marquee 18s linear infinite',
        float: 'float 7s ease-in-out infinite',
        pop: 'pop .35s cubic-bezier(.2,.8,.3,1.2) both',
        'slide-up': 'slideUp .4s cubic-bezier(.2,.8,.3,1) both',
        shimmer: 'shimmer 1.3s linear infinite',
        blip: 'blip 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
