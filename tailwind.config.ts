import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Berna&co palette. The values are CSS variables (injected by the CMS in
        // the layout) with the original hex as fallback, so the design is
        // identical until the admin changes a color.
        ink: "var(--color-ink, #0A0A0A)", // black: hero bg, footer, buttons, strong text
        cream: "var(--color-cream, #F5F0EB)", // soft alternate bg
        line: "var(--color-line, #E8E3DC)", // borders, separators
        muted: "var(--color-muted, #6B6560)", // secondary text
        accent: "var(--color-accent, #c0392b)", // promo red
      },
      fontFamily: {
        // Grotesque workhorse (headlines + UI) and the serif accent.
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
