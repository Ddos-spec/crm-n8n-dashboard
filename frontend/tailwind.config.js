/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F766E', // teal-700
        secondary: '#64748B', // slate-500
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
      }
    },
  },
  plugins: [],
}
