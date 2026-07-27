/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f9fc',
          100: '#edf2fb',
          200: '#dbe5f6',
          300: '#b6c9ed',
          400: '#7f9bdc',
          500: '#4f6fc6',
          600: '#3653a7',
          700: '#2c4587',
          800: '#223867',
          900: '#172544',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(20, 30, 60, 0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at top left, rgba(251,146,60,0.35), transparent 35%), radial-gradient(circle at top right, rgba(79,112,198,0.45), transparent 30%), linear-gradient(180deg, #08111f 0%, #0f172a 100%)',
      },
    },
  },
  plugins: [],
};
