// CMS read helpers. The storefront reads its texts/images/theme/sections from
// the DB. Each helper takes a `preview` flag: when true it returns the *Draft
// values (for the admin preview), otherwise the published values.
//
// All reads are cached per-request via a loader so a page hits the DB once.
// Missing keys fall back to a provided default and log a warning (never crash).

import { prisma } from "@/lib/db";
import { cache } from "react";

export type ThemeColors = {
  ink: string;
  cream: string;
  line: string;
  muted: string;
  accent: string;
};

export type Typography = {
  headingFont: string;
  bodyFont: string;
  headingWeight: string;
};

export const DEFAULT_THEME: ThemeColors = {
  ink: "#0A0A0A",
  cream: "#F5F0EB",
  line: "#E8E3DC",
  muted: "#6B6560",
  accent: "#c0392b",
};

export const DEFAULT_TYPOGRAPHY: Typography = {
  headingFont: "Archivo",
  bodyFont: "Archivo",
  headingWeight: "900",
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
}

// ---- Bundle loader (one DB round-trip per request) -------------------------

export type CmsBundle = {
  texts: Map<string, { value: string; valueDraft: string }>;
  images: Map<string, { url: string; urlDraft: string }>;
  content: {
    themeColors: string;
    themeColorsDraft: string;
    typography: string;
    typographyDraft: string;
    logoUrl: string;
    logoUrlDraft: string;
  } | null;
  sections: {
    key: string;
    page: string;
    order: number;
    orderDraft: number;
    visible: boolean;
    visibleDraft: boolean;
    type: string;
    config: string;
    configDraft: string;
  }[];
};

// `cache()` dedupes within a single render pass (React Server Components).
export const loadCmsBundle = cache(async (): Promise<CmsBundle> => {
  const [texts, images, content, sections] = await Promise.all([
    prisma.siteText.findMany({
      select: { key: true, value: true, valueDraft: true },
    }),
    prisma.siteImage.findMany({
      select: { key: true, url: true, urlDraft: true },
    }),
    prisma.siteContent.findUnique({ where: { id: "singleton" } }),
    prisma.siteSection.findMany({ orderBy: { order: "asc" } }),
  ]);
  return {
    texts: new Map(texts.map((t) => [t.key, t])),
    images: new Map(images.map((i) => [i.key, i])),
    content: content
      ? {
          themeColors: content.themeColors,
          themeColorsDraft: content.themeColorsDraft,
          typography: content.typography,
          typographyDraft: content.typographyDraft,
          logoUrl: content.logoUrl,
          logoUrlDraft: content.logoUrlDraft,
        }
      : null,
    sections,
  };
});

// ---- Public accessors (take the bundle + preview flag) ---------------------

export function getSiteText(
  bundle: CmsBundle,
  key: string,
  fallback: string,
  preview = false
): string {
  const row = bundle.texts.get(key);
  if (!row) {
    console.warn(`[cms] missing text "${key}" — using fallback`);
    return fallback;
  }
  const v = preview ? row.valueDraft : row.value;
  return v && v.length > 0 ? v : fallback;
}

export function getSiteImage(
  bundle: CmsBundle,
  key: string,
  fallback: string,
  preview = false
): string {
  const row = bundle.images.get(key);
  if (!row) {
    console.warn(`[cms] missing image "${key}" — using fallback`);
    return fallback;
  }
  const v = preview ? row.urlDraft : row.url;
  return v && v.length > 0 ? v : fallback;
}

export function getThemeColors(bundle: CmsBundle, preview = false): ThemeColors {
  if (!bundle.content) return DEFAULT_THEME;
  const raw = preview
    ? bundle.content.themeColorsDraft
    : bundle.content.themeColors;
  return parseJson(raw, DEFAULT_THEME);
}

export function getTypography(bundle: CmsBundle, preview = false): Typography {
  if (!bundle.content) return DEFAULT_TYPOGRAPHY;
  const raw = preview
    ? bundle.content.typographyDraft
    : bundle.content.typography;
  return parseJson(raw, DEFAULT_TYPOGRAPHY);
}

export function getLogo(bundle: CmsBundle, preview = false): string {
  if (!bundle.content) return "";
  return preview ? bundle.content.logoUrlDraft : bundle.content.logoUrl;
}

export type SectionView = {
  key: string;
  type: string;
  config: Record<string, unknown>;
};

// Active, ordered sections for a page (honoring draft order/visibility in
// preview).
export function getSections(
  bundle: CmsBundle,
  page: string,
  preview = false
): SectionView[] {
  return bundle.sections
    .filter((s) => s.page === page)
    .filter((s) => (preview ? s.visibleDraft : s.visible))
    .sort((a, b) =>
      preview ? a.orderDraft - b.orderDraft : a.order - b.order
    )
    .map((s) => ({
      key: s.key,
      type: s.type,
      config: parseJson<Record<string, unknown>>(
        preview ? s.configDraft : s.config,
        {}
      ),
    }));
}

// CSS variables string for inlining the theme into <html style=...>.
export function themeToCssVars(theme: ThemeColors): string {
  return [
    `--color-ink:${theme.ink}`,
    `--color-cream:${theme.cream}`,
    `--color-line:${theme.line}`,
    `--color-muted:${theme.muted}`,
    `--color-accent:${theme.accent}`,
  ].join(";");
}
