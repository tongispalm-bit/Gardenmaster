import type { Config } from 'tailwindcss';

// สีที่ใช้แบบ dynamic ใน category buttons และ badges (chemical-stock)
const DYNAMIC_COLORS = ['rose', 'sky', 'emerald', 'amber', 'orange', 'lime', 'teal', 'indigo', 'purple', 'green', 'blue', 'pink', 'fuchsia', 'cyan', 'yellow'];

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // safelist — บังคับให้ class ที่สร้าง dynamic ($var) ถูก include เข้า bundle
  safelist: [
    ...DYNAMIC_COLORS.flatMap(c => [
      `bg-${c}-50`,
      `bg-${c}-100`,
      { pattern: new RegExp(`(bg|text|border|ring)-${c}-(50|100|200|300|400|500|600|700|800|900)(\\/[0-9]+)?`) },
      { pattern: new RegExp(`dark:(bg|text|border|ring)-${c}-(50|100|200|300|400|500|600|700|800|900)(\\/[0-9]+)?`) },
    ]),
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
