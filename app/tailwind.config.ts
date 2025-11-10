import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb))',
        foreground: 'rgb(var(--foreground-rgb))',
        card: {
          DEFAULT: '#0f0f0f',
          foreground: '#ffffff',
        },
        border: '#282828',
            accent: {
              DEFAULT: '#ff4848',
              hover: '#dc2626',
            },
            primary: {
              DEFAULT: '#ff4848',
              50: '#fef2f2',
              100: '#fee2e2',
              200: '#fecaca',
              300: '#fca5a5',
              400: '#f87171',
              500: '#ff4848',
              600: '#dc2626',
              700: '#b91c1c',
              800: '#991b1b',
              900: '#7f1d1d',
            },
      },
      backgroundColor: {
        DEFAULT: '#000000',
        card: '#0f0f0f',
      },
    },
  },
  plugins: [],
}
export default config

