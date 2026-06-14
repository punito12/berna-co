import type { CSSProperties } from "react";
import { CMS_FONT_SET } from "@/lib/cms-fonts";

export type CmsSectionDesign = {
  backgroundColor?: string;
  textColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  titleFont?: string;
  titleSize?: string;
  textFont?: string;
  textSize?: string;
  paddingTop?: string;
  paddingBottom?: string;
  align?: "left" | "center" | "right";
};

export type CmsButtonDesign = {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontSize?: string;
  paddingX?: string;
  paddingY?: string;
  width?: "auto" | "full";
  uppercase?: "on" | "off";
  shadow?: "none" | "soft";
};

export type CmsButtonDesignMap = Record<string, CmsButtonDesign>;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const PX_RE = /^\d{1,3}px$/;
const BORDER_RE = /^[0-8]px$/;
const RADIUS_RE = /^(\d{1,3}px|9999px)$/;
const ALIGN = new Set(["left", "center", "right"]);
const WIDTH = new Set(["auto", "full"]);
const UPPERCASE = new Set(["on", "off"]);
const SHADOW = new Set(["none", "soft"]);

function color(value: unknown): string | undefined {
  return typeof value === "string" && HEX_RE.test(value) ? value : undefined;
}

function px(value: unknown): string | undefined {
  return typeof value === "string" && PX_RE.test(value) ? value : undefined;
}

function border(value: unknown): string | undefined {
  return typeof value === "string" && BORDER_RE.test(value) ? value : undefined;
}

function radius(value: unknown): string | undefined {
  return typeof value === "string" && RADIUS_RE.test(value) ? value : undefined;
}

function font(value: unknown): string | undefined {
  return typeof value === "string" && CMS_FONT_SET.has(value) ? value : undefined;
}

function pick<T extends string>(
  value: unknown,
  allowed: Set<string>
): T | undefined {
  return typeof value === "string" && allowed.has(value)
    ? (value as T)
    : undefined;
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  ) as T;
}

export function sanitizeSectionDesign(input: unknown): CmsSectionDesign {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  return clean({
    backgroundColor: color(raw.backgroundColor),
    textColor: color(raw.textColor),
    titleColor: color(raw.titleColor),
    subtitleColor: color(raw.subtitleColor),
    titleFont: font(raw.titleFont),
    titleSize: px(raw.titleSize),
    textFont: font(raw.textFont),
    textSize: px(raw.textSize),
    paddingTop: px(raw.paddingTop),
    paddingBottom: px(raw.paddingBottom),
    align: pick<CmsSectionDesign["align"] & string>(raw.align, ALIGN),
  });
}

export function sanitizeButtonDesign(input: unknown): CmsButtonDesign {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  return clean({
    backgroundColor: color(raw.backgroundColor),
    textColor: color(raw.textColor),
    borderColor: color(raw.borderColor),
    borderWidth: border(raw.borderWidth),
    borderRadius: radius(raw.borderRadius),
    fontFamily: font(raw.fontFamily),
    fontSize: px(raw.fontSize),
    paddingX: px(raw.paddingX),
    paddingY: px(raw.paddingY),
    width: pick<CmsButtonDesign["width"] & string>(raw.width, WIDTH),
    uppercase: pick<CmsButtonDesign["uppercase"] & string>(raw.uppercase, UPPERCASE),
    shadow: pick<CmsButtonDesign["shadow"] & string>(raw.shadow, SHADOW),
  });
}

export function sanitizeButtonDesignMap(input: unknown): CmsButtonDesignMap {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const out: CmsButtonDesignMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[a-z0-9._-]{1,60}$/i.test(key)) continue;
    const safe = sanitizeButtonDesign(value);
    if (Object.keys(safe).length > 0) out[key] = safe;
  }
  return out;
}

export function sectionDesignToStyle(
  design?: CmsSectionDesign
): CSSProperties {
  if (!design) return {};
  return clean({
    backgroundColor: design.backgroundColor,
    color: design.textColor,
    textAlign: design.align,
    paddingTop: design.paddingTop,
    paddingBottom: design.paddingBottom,
  }) as CSSProperties;
}

export function titleDesignToStyle(design?: CmsSectionDesign): CSSProperties {
  if (!design) return {};
  return clean({
    color: design.titleColor,
    fontFamily: design.titleFont ? `"${design.titleFont}", sans-serif` : undefined,
    fontSize: design.titleSize,
  }) as CSSProperties;
}

export function subtitleDesignToStyle(design?: CmsSectionDesign): CSSProperties {
  if (!design) return {};
  return clean({
    color: design.subtitleColor ?? design.textColor,
    fontFamily: design.textFont ? `"${design.textFont}", sans-serif` : undefined,
    fontSize: design.textSize,
  }) as CSSProperties;
}

export function buttonDesignToStyle(design?: CmsButtonDesign): CSSProperties {
  if (!design) return {};
  return clean({
    backgroundColor: design.backgroundColor,
    color: design.textColor,
    borderColor: design.borderColor,
    borderWidth: design.borderWidth,
    borderStyle:
      design.borderColor || design.borderWidth ? "solid" : undefined,
    borderRadius: design.borderRadius,
    fontFamily: design.fontFamily ? `"${design.fontFamily}", sans-serif` : undefined,
    fontSize: design.fontSize,
    paddingLeft: design.paddingX,
    paddingRight: design.paddingX,
    paddingTop: design.paddingY,
    paddingBottom: design.paddingY,
    width: design.width === "full" ? "100%" : undefined,
    textTransform:
      design.uppercase === "on"
        ? "uppercase"
        : design.uppercase === "off"
        ? "none"
        : undefined,
    boxShadow:
      design.shadow === "soft"
        ? "0 16px 35px rgba(10,10,10,0.16)"
        : design.shadow === "none"
        ? "none"
        : undefined,
  }) as CSSProperties;
}
