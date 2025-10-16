/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985'
        },
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#f59e0b',
        info: '#0ea5e9'
      }
    }
  },
  plugins: []
};
