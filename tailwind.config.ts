import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orchard: {
          mangosteen: '#9b59b6',
          durian: '#27ae60',
          durian2: '#f39c12',
        },
      },
    },
  },
  plugins: [],
};
export default config;
