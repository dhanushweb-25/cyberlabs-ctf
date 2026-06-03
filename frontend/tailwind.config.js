/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#036c5f',
          light: '#048c7c',
          dark: '#024d44',
        },
        secondary: {
          DEFAULT: '#1f8fbc',
          light: '#3fa6d2',
          dark: '#16698b',
        },
        ctfBg: '#f8fafc',
        ctfCard: '#ffffff',
        ctfText: '#1e293b',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
