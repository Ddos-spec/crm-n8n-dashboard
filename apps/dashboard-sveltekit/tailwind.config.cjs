/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f7fb'
        },
        ink: {
          DEFAULT: '#1b1e28',
          soft: '#4b5563'
        },
        accent: {
          DEFAULT: '#2563eb',
          muted: '#dbeafe'
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
