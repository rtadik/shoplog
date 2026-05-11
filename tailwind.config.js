/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a1a',
        paper: '#fafaf7',
        accent: '#1f6feb',
      },
    },
  },
  plugins: [],
};
