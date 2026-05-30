import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Berna&co palette — see docs/ROADMAP design system. Do not add others.
        ink: "#0A0A0A", // black: hero bg, footer, primary buttons, strong text
        cream: "#F5F0EB", // soft alternate bg for product sections
        line: "#E8E3DC", // borders, separators
        muted: "#6B6560", // secondary text, weights, descriptions
      },
    },
  },
  plugins: [],
};

export default config;
