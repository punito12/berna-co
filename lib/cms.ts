// CMS read helpers. The storefront reads its texts/images/theme/sections from
// the DB. Each helper takes a `preview` flag: when true it returns the *Draft
// values (for the admin preview), otherwise the published values.
//
// All reads are cached per-request via a loader so a page hits the DB once.
// Missing keys fall back to a provided default and log a warning (never crash).

import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { SiteSection } from "@prisma/client";
import { cookies } from "next/headers";
import {
  isDeletedBlockConfig,
  isDraftOnlyBlockConfig,
  parseBlockConfig,
} from "@/lib/cms-blocks";
import { parseTextStyle, textStyleCssRule } from "@/lib/cms-text-styles";
import { cache } from "react";

export type ThemeColors = {
  ink: string;
  cream: string;
  line: string;
  muted: string;
  accent: string;
  bg: string;
  buttonBg: string;
  buttonText: string;
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
  bg: "#FFFFFF",
  buttonBg: "#0A0A0A",
  buttonText: "#FFFFFF",
};

export const DEFAULT_TYPOGRAPHY: Typography = {
  headingFont: "Archivo",
  bodyFont: "Inter",
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
  texts: Map<
    string,
    { value: string; valueDraft: string; style: string; styleDraft: string }
  >;
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
    id: string;
    key: string;
    page: string;
    order: number;
    orderDraft: number;
    visible: boolean;
    visibleDraft: boolean;
    type: string;
    config: string;
    configDraft: string;
    updatedAt: Date;
  }[];
};

// `cache()` dedupes within a single render pass (React Server Components).
export const loadCmsBundle = cache(async (): Promise<CmsBundle> => {
  const [texts, images, content, sections] = await Promise.all([
    prisma.siteText.findMany({
      select: {
        key: true,
        value: true,
        valueDraft: true,
        style: true,
        styleDraft: true,
      },
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

export function cmsTextAttrs(key: string): { "data-cms-text": string } {
  return { "data-cms-text": key };
}

export async function isPreview(): Promise<boolean> {
  return cookies().get("cms-preview")?.value === "1" && isAuthenticated();
}

export async function getText(
  key: string,
  fallback = ""
): Promise<string> {
  const bundle = await loadCmsBundle();
  return getSiteText(bundle, key, fallback, await isPreview());
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

export async function getImage(
  key: string,
  fallback = ""
): Promise<string> {
  const bundle = await loadCmsBundle();
  return getSiteImage(bundle, key, fallback, await isPreview());
}

export function getThemeColors(bundle: CmsBundle, preview = false): ThemeColors {
  if (!bundle.content) return DEFAULT_THEME;
  const raw = preview
    ? bundle.content.themeColorsDraft
    : bundle.content.themeColors;
  return parseJson(raw, DEFAULT_THEME);
}

export async function getColors(): Promise<Record<string, string>> {
  const bundle = await loadCmsBundle();
  return getThemeColors(bundle, await isPreview());
}

export function getTypography(bundle: CmsBundle, preview?: boolean): Typography;
export function getTypography(): Promise<Typography>;
export function getTypography(
  bundle?: CmsBundle,
  preview = false
): Typography | Promise<Typography> {
  if (!bundle) {
    return loadCmsBundle().then(async (cms) =>
      getTypography(cms, await isPreview())
    );
  }
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

function sectionIsVisible(section: CmsBundle["sections"][number], preview: boolean) {
  if (preview) {
    return section.visibleDraft && !isDeletedBlockConfig(section.configDraft);
  }
  return (
    section.visible &&
    !isDeletedBlockConfig(section.config) &&
    !isDraftOnlyBlockConfig(section.config)
  );
}

// Active, ordered sections for a page (honoring draft order/visibility in
// preview).
export function getSections(
  bundle: CmsBundle,
  page: string,
  preview?: boolean
): SectionView[];
export function getSections(page: string): Promise<SiteSection[]>;
export function getSections(
  bundleOrPage: CmsBundle | string,
  page?: string,
  preview = false
): SectionView[] | Promise<SiteSection[]> {
  if (typeof bundleOrPage === "string") {
    return loadCmsBundle().then(async (bundle) => {
      const usePreview = await isPreview();
      return bundle.sections
        .filter((s) => s.page === bundleOrPage)
        .filter((s) => sectionIsVisible(s, usePreview))
        .sort((a, b) =>
          usePreview ? a.orderDraft - b.orderDraft : a.order - b.order
        )
        .map(
          (s) =>
            ({
              id: s.id,
              key: s.key,
              page: s.page,
              order: usePreview ? s.orderDraft : s.order,
              orderDraft: s.orderDraft,
              visible: usePreview ? s.visibleDraft : s.visible,
              visibleDraft: s.visibleDraft,
              type: s.type,
              config: usePreview ? s.configDraft : s.config,
              configDraft: s.configDraft,
              updatedAt: s.updatedAt,
            }) satisfies SiteSection
        );
    });
  }
  const bundle = bundleOrPage;
  const targetPage = page ?? "home";
  return bundle.sections
    .filter((s) => s.page === targetPage)
    .filter((s) => sectionIsVisible(s, preview))
    .sort((a, b) =>
      preview ? a.orderDraft - b.orderDraft : a.order - b.order
    )
    .map((s) => ({
      key: s.key,
      type: s.type,
      config: parseBlockConfig(preview ? s.configDraft : s.config),
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
    `--color-bg:${theme.bg}`,
    `--color-button-bg:${theme.buttonBg}`,
    `--color-button-text:${theme.buttonText}`,
  ].join(";");
}

export function typographyToCssVars(typography: Typography): string {
  return [
    `--font-heading:${JSON.stringify(typography.headingFont)}`,
    `--font-body:${JSON.stringify(typography.bodyFont)}`,
    `--weight-heading:${typography.headingWeight}`,
  ].join(";");
}

export function textStylesToCss(bundle: CmsBundle, preview = false): string {
  const rules: string[] = [];
  for (const [key, row] of bundle.texts) {
    const style = parseTextStyle(preview ? row.styleDraft : row.style);
    const rule = textStyleCssRule(key, style);
    if (rule) rules.push(rule);
  }
  return rules.join("");
}
