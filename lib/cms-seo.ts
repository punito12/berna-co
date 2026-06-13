// SEO / social-share settings, editable from the CMS (Editor → SEO y compartir).
// Reuses SiteText (titles/descriptions) and SiteImage (social image). Every
// value falls back to the current hardcoded SEO, so metadata is unchanged until
// the owner edits it. Read inside generateMetadata() on the relevant pages.

import { prisma } from "@/lib/db";
import type { CmsBundle } from "@/lib/cms";
import { getSiteText, getSiteImage } from "@/lib/cms";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
} from "@/lib/seo";

// --- Keys -------------------------------------------------------------------

export const SEO_GLOBAL = {
  title: "seo.site.title",
  description: "seo.site.description",
  ogTitle: "seo.share.title",
  ogDescription: "seo.share.description",
};
export const SEO_OG_IMAGE_KEY = "seo.share.image";

// Per-page title/description keys (only the safe, high-value pages).
export const SEO_PAGES = {
  home: { title: "seo.home.title", description: "seo.home.description" },
  confianza: {
    title: "seo.confianza.title",
    description: "seo.confianza.description",
  },
};

// --- Readers (CMS value → fallback to current hardcoded SEO) -----------------

export function getGlobalSeo(cms: CmsBundle, preview = false) {
  const title = getSiteText(cms, SEO_GLOBAL.title, SITE_TITLE, preview);
  const description = getSiteText(
    cms,
    SEO_GLOBAL.description,
    SITE_DESCRIPTION,
    preview
  );
  // OG title/description fall back to the (possibly edited) page title/desc.
  const ogTitle = getSiteText(cms, SEO_GLOBAL.ogTitle, title, preview);
  const ogDescription = getSiteText(
    cms,
    SEO_GLOBAL.ogDescription,
    description,
    preview
  );
  const ogImage = getSiteImage(
    cms,
    SEO_OG_IMAGE_KEY,
    DEFAULT_OG_IMAGE,
    preview
  );
  return { title, description, ogTitle, ogDescription, ogImage };
}

// Per-page title/description, falling back to the provided current values.
export function getPageSeo(
  cms: CmsBundle,
  page: keyof typeof SEO_PAGES,
  fallbackTitle: string,
  fallbackDescription: string,
  preview = false
) {
  const keys = SEO_PAGES[page];
  return {
    title: getSiteText(cms, keys.title, fallbackTitle, preview),
    description: getSiteText(cms, keys.description, fallbackDescription, preview),
  };
}

// --- CMS rows + idempotent ensure -------------------------------------------

export const SEO_CMS_TEXTS = [
  { key: SEO_GLOBAL.title, value: SITE_TITLE, maxLength: 70 },
  { key: SEO_GLOBAL.description, value: SITE_DESCRIPTION, maxLength: 200 },
  { key: SEO_GLOBAL.ogTitle, value: "", maxLength: 70 },
  { key: SEO_GLOBAL.ogDescription, value: "", maxLength: 200 },
  { key: SEO_PAGES.home.title, value: SITE_TITLE, maxLength: 70 },
  { key: SEO_PAGES.home.description, value: SITE_DESCRIPTION, maxLength: 200 },
  { key: SEO_PAGES.confianza.title, value: "Cómo comprar", maxLength: 70 },
  {
    key: SEO_PAGES.confianza.description,
    value:
      "Cómo comprar en Berna&co: pasos del pedido, envíos y zonas, conservación de congelados, medios de pago y preguntas frecuentes.",
    maxLength: 200,
  },
];

export const SEO_CMS_IMAGES = [
  { key: SEO_OG_IMAGE_KEY, url: DEFAULT_OG_IMAGE },
];

// Creates missing SEO text + image rows so they're editable. Never overwrites
// existing (edited/published) values. Single batch transaction (safe on Neon).
export async function ensureSeoCmsRows(): Promise<void> {
  const textKeys = SEO_CMS_TEXTS.map((t) => t.key);
  const imageKeys = SEO_CMS_IMAGES.map((i) => i.key);
  const [existingTexts, existingImages] = await Promise.all([
    prisma.siteText.findMany({
      where: { key: { in: textKeys } },
      select: { key: true },
    }),
    prisma.siteImage.findMany({
      where: { key: { in: imageKeys } },
      select: { key: true },
    }),
  ]);
  const textPresent = new Set(existingTexts.map((r) => r.key));
  const imagePresent = new Set(existingImages.map((r) => r.key));
  const textsToCreate = SEO_CMS_TEXTS.filter((t) => !textPresent.has(t.key));
  const imagesToCreate = SEO_CMS_IMAGES.filter((i) => !imagePresent.has(i.key));

  const ops = [
    ...textsToCreate.map((t) =>
      prisma.siteText.create({
        data: {
          key: t.key,
          value: t.value,
          valueDraft: t.value,
          maxLength: t.maxLength,
          category: "seo",
        },
      })
    ),
    ...imagesToCreate.map((i) =>
      prisma.siteImage.create({
        data: { key: i.key, url: i.url, urlDraft: i.url, category: "seo" },
      })
    ),
  ];
  if (ops.length === 0) return;
  await prisma.$transaction(ops);
}
