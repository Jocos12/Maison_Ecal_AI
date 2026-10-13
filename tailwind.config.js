/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand blue: the steel blue of the login buttons (#24478a) is the main colour of the app.
        blue: {
          50: '#eef3fb',
          100: '#dde7f6',
          200: '#bccfee',
          300: '#8fafe0',
          400: '#5b84c8',
          500: '#2c5aa8',
          600: '#24478a',
          700: '#1b3a73',
          800: '#15294a',
          900: '#0e1c33',
          950: '#0a1424'
        },
        ecal: {
          blue: '#24478a',
          dark: '#0f172a',
          accent: '#2c5aa8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        authFloat1: {
          '0%,100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(40px, 20px)' }
        },
        authFloat2: {
          '0%,100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-30px, -25px)' }
        },
        authSpinSlow: {
          '0%,100%': { transform: 'rotate(45deg)', opacity: '0.2' },
          '50%': { transform: 'rotate(90deg)', opacity: '0.35' }
        }
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        'fade-in': 'fadeIn 0.45s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out 0.1s both',
        'auth-float-1': 'authFloat1 18s ease-in-out infinite',
        'auth-float-2': 'authFloat2 22s ease-in-out infinite',
        'auth-spin-slow': 'authSpinSlow 25s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
