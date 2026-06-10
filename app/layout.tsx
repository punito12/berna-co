import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  Anton,
  Archivo,
  Bebas_Neue,
  DM_Sans,
  Inter,
  Lora,
  Manrope,
  Merriweather,
  Montserrat,
  Oswald,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Roboto,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import {
  DEFAULT_THEME,
  DEFAULT_TYPOGRAPHY,
  getColors,
  getTypography,
  type ThemeColors,
  type Typography,
} from "@/lib/cms";

const archivoHeading = Archivo({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const interHeading = Inter({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const poppinsHeading = Poppins({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const montserratHeading = Montserrat({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const bebasHeading = Bebas_Neue({ subsets: ["latin"], display: "swap", weight: "400", variable: "--next-font-heading" });
const playfairHeading = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const loraHeading = Lora({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-heading" });
const robotoHeading = Roboto({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700", "900"], variable: "--next-font-heading" });
const oswaldHeading = Oswald({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-heading" });
const ralewayHeading = Raleway({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const merriweatherHeading = Merriweather({ subsets: ["latin"], display: "swap", weight: ["400", "700", "900"], variable: "--next-font-heading" });
const antonHeading = Anton({ subsets: ["latin"], display: "swap", weight: "400", variable: "--next-font-heading" });
const workSansHeading = Work_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const spaceGroteskHeading = Space_Grotesk({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-heading" });
const dmSansHeading = DM_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const manropeHeading = Manrope({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--next-font-heading" });
const outfitHeading = Outfit({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-heading" });
const jakartaHeading = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--next-font-heading" });

const archivoBody = Archivo({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const interBody = Inter({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const poppinsBody = Poppins({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const montserratBody = Montserrat({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const bebasBody = Bebas_Neue({ subsets: ["latin"], display: "swap", weight: "400", variable: "--next-font-body" });
const playfairBody = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const loraBody = Lora({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-body" });
const robotoBody = Roboto({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700", "900"], variable: "--next-font-body" });
const oswaldBody = Oswald({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-body" });
const ralewayBody = Raleway({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const merriweatherBody = Merriweather({ subsets: ["latin"], display: "swap", weight: ["400", "700", "900"], variable: "--next-font-body" });
const antonBody = Anton({ subsets: ["latin"], display: "swap", weight: "400", variable: "--next-font-body" });
const workSansBody = Work_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const spaceGroteskBody = Space_Grotesk({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--next-font-body" });
const dmSansBody = DM_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const manropeBody = Manrope({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--next-font-body" });
const outfitBody = Outfit({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"], variable: "--next-font-body" });
const jakartaBody = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--next-font-body" });

const headingFonts = {
  Archivo: archivoHeading,
  Inter: interHeading,
  Poppins: poppinsHeading,
  Montserrat: montserratHeading,
  "Bebas Neue": bebasHeading,
  "Playfair Display": playfairHeading,
  Lora: loraHeading,
  Roboto: robotoHeading,
  Oswald: oswaldHeading,
  Raleway: ralewayHeading,
  Merriweather: merriweatherHeading,
  Anton: antonHeading,
  "Work Sans": workSansHeading,
  "Space Grotesk": spaceGroteskHeading,
  "DM Sans": dmSansHeading,
  Manrope: manropeHeading,
  Outfit: outfitHeading,
  "Plus Jakarta Sans": jakartaHeading,
};

const bodyFonts = {
  Archivo: archivoBody,
  Inter: interBody,
  Poppins: poppinsBody,
  Montserrat: montserratBody,
  "Bebas Neue": bebasBody,
  "Playfair Display": playfairBody,
  Lora: loraBody,
  Roboto: robotoBody,
  Oswald: oswaldBody,
  Raleway: ralewayBody,
  Merriweather: merriweatherBody,
  Anton: antonBody,
  "Work Sans": workSansBody,
  "Space Grotesk": spaceGroteskBody,
  "DM Sans": dmSansBody,
  Manrope: manropeBody,
  Outfit: outfitBody,
  "Plus Jakarta Sans": jakartaBody,
};

type FontName = keyof typeof headingFonts;
type CssVars = CSSProperties & Record<`--${string}`, string>;

function supportedFont(name: string): FontName {
  return name in headingFonts ? (name as FontName) : "Archivo";
}

function cmsCssVars(colors: ThemeColors, typography: Typography): CssVars {
  return {
    "--color-ink": colors.ink,
    "--color-cream": colors.cream,
    "--color-line": colors.line,
    "--color-muted": colors.muted,
    "--color-accent": colors.accent,
    "--color-bg": colors.bg,
    "--color-button-bg": colors.buttonBg,
    "--color-button-text": colors.buttonText,
    "--font-heading": "var(--next-font-heading)",
    "--font-body": "var(--next-font-body)",
    "--weight-heading": typography.headingWeight,
  };
}

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
  let colors: ThemeColors = DEFAULT_THEME;
  let typography: Typography = DEFAULT_TYPOGRAPHY;
  try {
    const [cmsColors, cmsTypography] = await Promise.all([
      getColors(),
      getTypography(),
    ]);
    colors = { ...DEFAULT_THEME, ...cmsColors };
    typography = { ...DEFAULT_TYPOGRAPHY, ...cmsTypography };
  } catch {
    // DB unavailable at render: keep local fallback variables.
  }

  const heading = headingFonts[supportedFont(typography.headingFont)];
  const body = bodyFonts[supportedFont(typography.bodyFont)];

  return (
    <html
      lang="es-AR"
      className={`${heading.variable} ${body.variable}`}
      style={cmsCssVars(colors, typography)}
    >
      <body className="font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
