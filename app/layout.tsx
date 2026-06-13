import type { Metadata } from "next";
import { Archivo, Fraunces } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import {
  loadCmsBundle,
  getThemeColors,
  themeToCssVars,
  textStylesToCss,
} from "@/lib/cms";
import {
  getStyleSettings,
  styleSettingsToCssVars,
} from "@/lib/cms-style-settings";
import { cmsGoogleFontsUrl } from "@/lib/cms-fonts";
import { getGlobalSeo } from "@/lib/cms-seo";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo";

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

const cmsFontsUrl = cmsGoogleFontsUrl();

// Metadata is generated from the CMS SEO settings (Editor → SEO y compartir),
// falling back to the hardcoded SITE_TITLE / SITE_DESCRIPTION / OG image — so
// the metadata is unchanged until the owner edits it. Note: this reads the
// PUBLISHED values (no preview) since metadata isn't rendered with the preview
// cookie; the editor has its own live preview card.
export async function generateMetadata(): Promise<Metadata> {
  let seo = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ogTitle: SITE_TITLE,
    ogDescription: SITE_DESCRIPTION,
    ogImage: DEFAULT_OG_IMAGE,
  };
  try {
    const bundle = await loadCmsBundle();
    seo = getGlobalSeo(bundle);
  } catch {
    // DB unavailable — keep hardcoded fallbacks.
  }
  const ogImageUrl = absoluteUrl(seo.ogImage);
  return {
    metadataBase: getSiteUrl(),
    title: {
      default: seo.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: seo.description,
    applicationName: SITE_NAME,
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        { url: "/images/logo-dark.png", type: "image/png" },
        { url: "/images/logo-light.png", type: "image/png" },
      ],
      apple: [{ url: "/images/logo-dark.png", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: absoluteUrl("/"),
      siteName: SITE_NAME,
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Berna&co - carnes, milanesas y congelados premium",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

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
    const themeVars = themeToCssVars(getThemeColors(bundle));
    const styleVars = styleSettingsToCssVars(getStyleSettings(bundle));
    cssVars = [themeVars, styleVars].filter(Boolean).join(";");
    textStyleCss = textStylesToCss(bundle);
  } catch {
    // DB unavailable at render — fall back to the hex defaults in tailwind.
  }

  return (
    <html lang="es-AR" className={`${archivo.variable} ${fraunces.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={cmsFontsUrl} rel="stylesheet" />
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
