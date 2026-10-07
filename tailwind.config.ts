/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          gray100: '#161616',
          gray90: '#262626',
          gray80: '#393939',
          gray70: '#525252',
          gray60: '#6f6f6f',
          gray50: '#8d8d8d',
          gray20: '#d1d1d1',
          gray10: '#f4f4f4',
          blue60: '#0f62fe',
          blue70: '#0043ce',
          green50: '#24a148',
          green60: '#198038',
          red50: '#fa4d56',
          red60: '#da1e28',
          yellow30: '#f1c21b',
        },
      },
    },
  },
  plugins: [],
};
