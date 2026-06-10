import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        cream: "var(--color-cream)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        bg: "var(--color-bg)",
        buttonBg: "var(--color-button-bg)",
        buttonText: "var(--color-button-text)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        serif: ["var(--font-body)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
