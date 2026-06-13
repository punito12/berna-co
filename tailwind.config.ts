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
        // Primary CTA buttons. Editable from the CMS (Marca y estilos); the hex
        // fallback equals the current design, so buttons look identical until
        // the owner changes the button colors.
        button: "var(--color-button-bg, #0A0A0A)",
        "button-text": "var(--color-button-text, #FFFFFF)",
        // Phase 3 — global ecommerce colors (CMS-editable, fallback = current).
        "button-secondary-text": "var(--color-button-secondary-text, #0A0A0A)",
        "card-bg": "var(--color-card-bg, #FFFFFF)",
        "card-border": "var(--color-card-border, #E8E3DC)",
        "product-name": "var(--color-product-name, #0A0A0A)",
        price: "var(--color-price, #000000)",
        "price-promo": "var(--color-price-promo, #c0392b)",
        "chip-bg": "var(--color-chip-bg, #F5F0EB)",
        "chip-border": "var(--color-chip-border, #E8E3DC)",
        "chip-text": "var(--color-chip-text, #0A0A0A)",
        "filter-active-bg": "var(--color-filter-active-bg, #0A0A0A)",
        "filter-active-text": "var(--color-filter-active-text, #FFFFFF)",
        "filter-inactive-bg": "var(--color-filter-inactive-bg, #FFFFFF)",
        "filter-inactive-text": "var(--color-filter-inactive-text, #0A0A0A)",
        "filter-border": "var(--color-filter-border, #E8E3DC)",
        "badge-new-bg": "var(--color-badge-new-bg, #0A0A0A)",
        "badge-new-text": "var(--color-badge-new-text, #FFFFFF)",
        "badge-stock-bg": "var(--color-badge-stock-bg, #0A0A0A)",
        "badge-stock-text": "var(--color-badge-stock-text, #FFFFFF)",
        "badge-promo-bg": "var(--color-badge-promo-bg, #c0392b)",
        "badge-promo-text": "var(--color-badge-promo-text, #FFFFFF)",
        "hero-btn-bg": "var(--color-hero-btn-bg, #FFFFFF)",
        "hero-btn-text": "var(--color-hero-btn-text, #0A0A0A)",
        "empanado-active-bg": "var(--color-empanado-active-bg, #0A0A0A)",
        "empanado-active-text": "var(--color-empanado-active-text, #FFFFFF)",
        "empanado-inactive-bg": "var(--color-empanado-inactive-bg, #FFFFFF)",
        "empanado-inactive-text": "var(--color-empanado-inactive-text, #0A0A0A)",
        "empanado-border": "var(--color-empanado-border, #0A0A0A)",
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
