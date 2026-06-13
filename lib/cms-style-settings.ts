// Phase 3 — Tanda 2. Non-color global style settings (shapes, shadows, fonts,
// sizes, uppercase) for the storefront. Stored as a `styles` sub-object inside
// the SiteContent `typography` JSON. Every value falls back to the current
// design, so an empty/missing setting renders exactly like today.

import {
  DEFAULT_STYLE_SETTINGS,
  type CmsBundle,
  type StyleSettings,
} from "@/lib/cms";
import { CMS_FONT_SET } from "@/lib/cms-fonts";

const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700", "800", "900"]);
const ALLOWED_RADIUS = new Set(["0px", "8px", "12px", "16px", "20px", "9999px"]);
const ALLOWED_SHADOW = new Set(["", "none", "soft", "medium"]);
const ALLOWED_TOGGLE = new Set(["", "on", "off"]);
const SIZE_RE = /^\d{1,2}(\.\d{1,2})?px$/;
const SPACING_RE = /^-?\d(\.\d{1,3})?em$/;
const BORDER_RE = /^[0-3]px$/;

function pickFont(v: unknown): string {
  return typeof v === "string" && CMS_FONT_SET.has(v) ? v : "";
}
function pickWeight(v: unknown): string {
  return typeof v === "string" && ALLOWED_WEIGHTS.has(v) ? v : "";
}
function pickRadius(v: unknown): string {
  return typeof v === "string" && ALLOWED_RADIUS.has(v) ? v : "";
}
function pickSize(v: unknown): string {
  return typeof v === "string" && SIZE_RE.test(v) ? v : "";
}
function pickSpacing(v: unknown): string {
  return typeof v === "string" && SPACING_RE.test(v) ? v : "";
}
function pickBorder(v: unknown): string {
  return typeof v === "string" && BORDER_RE.test(v) ? v : "";
}
function pickToggle(v: unknown): "" | "on" | "off" {
  return typeof v === "string" && ALLOWED_TOGGLE.has(v)
    ? (v as "" | "on" | "off")
    : "";
}
function pickShadow(v: unknown): "" | "none" | "soft" | "medium" {
  return typeof v === "string" && ALLOWED_SHADOW.has(v)
    ? (v as "" | "none" | "soft" | "medium")
    : "";
}

// Validates an arbitrary object into a safe StyleSettings. Anything invalid
// becomes "" (inherit current design). Never throws.
export function sanitizeStyleSettings(input: unknown): StyleSettings {
  const o = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  return {
    buttonRadius: pickRadius(o.buttonRadius),
    buttonFont: pickFont(o.buttonFont),
    buttonWeight: pickWeight(o.buttonWeight),
    buttonSize: pickSize(o.buttonSize),
    buttonUppercase: pickToggle(o.buttonUppercase),
    buttonSecondaryFont: pickFont(o.buttonSecondaryFont),
    buttonSecondaryWeight: pickWeight(o.buttonSecondaryWeight),
    buttonSecondarySize: pickSize(o.buttonSecondarySize),
    buttonSecondaryUppercase: pickToggle(o.buttonSecondaryUppercase),
    buttonSecondaryUnderline: pickToggle(o.buttonSecondaryUnderline),
    cardRadius: pickRadius(o.cardRadius),
    cardShadow: pickShadow(o.cardShadow),
    cardBorderWidth: pickBorder(o.cardBorderWidth),
    nameFont: pickFont(o.nameFont),
    nameWeight: pickWeight(o.nameWeight),
    nameSizeMobile: pickSize(o.nameSizeMobile),
    nameSizeDesktop: pickSize(o.nameSizeDesktop),
    nameUppercase: pickToggle(o.nameUppercase),
    nameLetterSpacing: pickSpacing(o.nameLetterSpacing),
    priceFont: pickFont(o.priceFont),
    priceWeight: pickWeight(o.priceWeight),
    priceSizeMobile: pickSize(o.priceSizeMobile),
    priceSizeDesktop: pickSize(o.priceSizeDesktop),
    priceLetterSpacing: pickSpacing(o.priceLetterSpacing),
    chipRadius: pickRadius(o.chipRadius),
    chipWeight: pickWeight(o.chipWeight),
    chipSize: pickSize(o.chipSize),
    chipUppercase: pickToggle(o.chipUppercase),
    filterRadius: pickRadius(o.filterRadius),
    filterWeight: pickWeight(o.filterWeight),
    filterSize: pickSize(o.filterSize),
    filterUppercase: pickToggle(o.filterUppercase),
    badgeRadius: pickRadius(o.badgeRadius),
    badgeWeight: pickWeight(o.badgeWeight),
    badgeSize: pickSize(o.badgeSize),
    badgeUppercase: pickToggle(o.badgeUppercase),
    heroBtnRadius: pickRadius(o.heroBtnRadius),
    heroBtnFont: pickFont(o.heroBtnFont),
    heroBtnWeight: pickWeight(o.heroBtnWeight),
    heroBtnUppercase: pickToggle(o.heroBtnUppercase),
    empanadoRadius: pickRadius(o.empanadoRadius),
    empanadoFont: pickFont(o.empanadoFont),
    empanadoWeight: pickWeight(o.empanadoWeight),
    empanadoUppercase: pickToggle(o.empanadoUppercase),
    descriptionFont: pickFont(o.descriptionFont),
  };
}

// Reads the style settings out of the (typography JSON) bundle content.
export function getStyleSettings(
  bundle: CmsBundle,
  preview = false
): StyleSettings {
  if (!bundle.content) return DEFAULT_STYLE_SETTINGS;
  const raw = preview
    ? bundle.content.typographyDraft
    : bundle.content.typography;
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    return sanitizeStyleSettings(parsed.styles);
  } catch {
    return DEFAULT_STYLE_SETTINGS;
  }
}

// Maps the shadow preset to a CSS box-shadow value. "" / "none" → handled by
// fallback in CSS (the card keeps its current Tailwind shadow when the var is
// unset; "none" explicitly removes it).
const SHADOW_CSS: Record<string, string> = {
  none: "none",
  soft: "0 1px 0 rgba(10,10,10,0.03)",
  medium: "0 18px 45px rgba(10,10,10,0.10)",
};

// Translates a toggle into a text-transform value, or "" to inherit.
function transform(t: "" | "on" | "off"): string {
  if (t === "on") return "uppercase";
  if (t === "off") return "none";
  return "";
}

function fontFamily(f: string): string {
  return f ? `"${f}", sans-serif` : "";
}

// Emits only the vars that have a value. Public components reference these vars
// with a fallback equal to the current design, so unset vars = identical look.
export function styleSettingsToCssVars(s: StyleSettings): string {
  const v: [string, string][] = [
    ["--btn-radius", s.buttonRadius],
    ["--btn-font", fontFamily(s.buttonFont)],
    ["--btn-weight", s.buttonWeight],
    ["--btn-size", s.buttonSize],
    ["--btn-transform", transform(s.buttonUppercase)],
    ["--btn2-font", fontFamily(s.buttonSecondaryFont)],
    ["--btn2-weight", s.buttonSecondaryWeight],
    ["--btn2-size", s.buttonSecondarySize],
    ["--btn2-transform", transform(s.buttonSecondaryUppercase)],
    [
      "--btn2-underline",
      s.buttonSecondaryUnderline === "on"
        ? "underline"
        : s.buttonSecondaryUnderline === "off"
        ? "none"
        : "",
    ],
    ["--card-radius", s.cardRadius],
    ["--card-shadow", s.cardShadow ? SHADOW_CSS[s.cardShadow] ?? "" : ""],
    ["--card-border-width", s.cardBorderWidth],
    ["--name-font", fontFamily(s.nameFont)],
    ["--name-weight", s.nameWeight],
    ["--name-size", s.nameSizeDesktop],
    ["--name-size-mobile", s.nameSizeMobile],
    ["--name-transform", transform(s.nameUppercase)],
    ["--name-spacing", s.nameLetterSpacing],
    ["--price-font", fontFamily(s.priceFont)],
    ["--price-weight", s.priceWeight],
    ["--price-size", s.priceSizeDesktop],
    ["--price-size-mobile", s.priceSizeMobile],
    ["--price-spacing", s.priceLetterSpacing],
    ["--chip-radius", s.chipRadius],
    ["--chip-weight", s.chipWeight],
    ["--chip-size", s.chipSize],
    ["--chip-transform", transform(s.chipUppercase)],
    ["--filter-radius", s.filterRadius],
    ["--filter-weight", s.filterWeight],
    ["--filter-size", s.filterSize],
    ["--filter-transform", transform(s.filterUppercase)],
    ["--badge-radius", s.badgeRadius],
    ["--badge-weight", s.badgeWeight],
    ["--badge-size", s.badgeSize],
    ["--badge-transform", transform(s.badgeUppercase)],
    ["--hero-btn-radius", s.heroBtnRadius],
    ["--hero-btn-font", fontFamily(s.heroBtnFont)],
    ["--hero-btn-weight", s.heroBtnWeight],
    ["--hero-btn-transform", transform(s.heroBtnUppercase)],
    ["--empanado-radius", s.empanadoRadius],
    ["--empanado-font", fontFamily(s.empanadoFont)],
    ["--empanado-weight", s.empanadoWeight],
    ["--empanado-transform", transform(s.empanadoUppercase)],
    ["--description-font", fontFamily(s.descriptionFont)],
  ];
  return v
    .filter(([, value]) => value !== "")
    .map(([k, value]) => `${k}:${value}`)
    .join(";");
}
