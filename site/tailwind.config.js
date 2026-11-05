/** Próximo Nível · tokens do design system Laranja Pista */
module.exports = {
  content: ['./src/**/*.html'],
  theme: {
    screens: { sm: '561px', md: '861px', lg: '961px', xl: '1200px' },
    extend: {
      colors: {
        laranja: { DEFAULT: '#ff4f00', 100: '#ffe2d4', 300: '#ffaa81', 700: '#c23c00', 900: '#7a2500' },
        marinho: { DEFAULT: '#10183a', claro: '#1b2347', linha: '#3a4266' },
        papel: '#f5f1e8',
        concreto: '#c9c5bc',
        cinza: '#e8e9ec',
        apoio: { DEFAULT: '#5f6478', escuro: '#b9bccb' },
      },
      fontFamily: {
        display: ['Anton', '"Arial Narrow"', 'Impact', 'sans-serif'],
        texto: ['"DM Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: { sm: '6px', md: '12px', lg: '20px' },
      boxShadow: { flutuante: '0 12px 32px rgba(16, 24, 58, .18)' },
      maxWidth: { wrap: '1200px' },
      transitionTimingFunction: { pista: 'cubic-bezier(.2, .7, .2, 1)' },
      keyframes: {
        sobe: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'none' } },
        desliza: { to: { backgroundPosition: '345px 0' } },
        corre: { to: { transform: 'translateX(-50%)' } },
        brilho: { '0%, 55%': { left: '-60%' }, '85%, 100%': { left: '130%' } },
        pulso: { '0%': { boxShadow: '0 0 0 0 rgba(255, 79, 0, .55)' }, '70%, 100%': { boxShadow: '0 0 0 14px rgba(255, 79, 0, 0)' } },
        'pulso-marinho': { '0%': { boxShadow: '0 0 0 0 rgba(16, 24, 58, .5)' }, '70%, 100%': { boxShadow: '0 0 0 14px rgba(16, 24, 58, 0)' } },
        respira: { '0%, 100%': { scale: '1' }, '50%': { scale: '1.035' } },
      },
      animation: {
        sobe: 'sobe .7s cubic-bezier(.2, .7, .2, 1) both',
        desliza: 'desliza 14s linear infinite',
        corre: 'corre 32s linear infinite',
      },
    },
  },
  plugins: [],
};
