import type { Metadata } from "next";
import { Archivo, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import {
  loadCmsBundle,
  getThemeColors,
  themeToCssVars,
  textStylesToCss,
} from "@/lib/cms";

// Archivo: a strong grotesque with a true black weight — carries the bold,
// catalog-like uppercase headlines and all UI text.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

// Fraunces: a characterful "old style" serif with a beautiful italic. Used
// sparingly for editorial accent lines (e.g. "de nuestra cocina a tu freezer")
// to add refinement against the grotesque headlines.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Berna&co — Milanesas premium congeladas",
  description:
    "Milanesas premium artesanales, de nuestra cocina a tu freezer. LA VIDA ES RICA!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inject the CMS theme colors as CSS variables. Tailwind's color tokens read
  // these (with the original hex as fallback), so the design is unchanged until
  // the admin edits a color.
  let cssVars = "";
  let textStyleCss = "";
  try {
    const bundle = await loadCmsBundle();
    cssVars = themeToCssVars(getThemeColors(bundle));
    textStyleCss = textStylesToCss(bundle);
  } catch {
    // DB unavailable at render — fall back to the hex defaults in tailwind.
  }

  return (
    <html lang="es-AR" className={`${archivo.variable} ${fraunces.variable}`}>
      <head>
        {cssVars && (
          <style
            // CMS theme → CSS variables on :root. Tailwind tokens consume them.
            dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }}
          />
        )}
        {textStyleCss && (
          <style
            // Optional per-text CMS styles. Empty by default, so the current
            // design is unchanged until the admin publishes text styles.
            dangerouslySetInnerHTML={{ __html: textStyleCss }}
          />
        )}
      </head>
      <body className="font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
