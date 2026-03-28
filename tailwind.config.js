/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // 確保您的檔案路徑正確
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
