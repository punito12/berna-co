import type { CSSProperties } from "react";
import { CMS_FONT_SET } from "@/lib/cms-fonts";

export type CmsDesignTarget = "desktop" | "mobile";

export type CmsSectionDesignValues = {
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

export type CmsSectionDesign = CmsSectionDesignValues & {
  mobile?: CmsSectionDesignValues;
};

export type CmsButtonDesignValues = {
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

export type CmsButtonDesign = CmsButtonDesignValues & {
  mobile?: CmsButtonDesignValues;
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

const DEFAULT_SECTION_DESIGN: Required<CmsSectionDesignValues> = {
  backgroundColor: "#F7F1E8",
  textColor: "#6F655B",
  titleColor: "#0A0A0A",
  subtitleColor: "#6F655B",
  titleFont: "Archivo",
  titleSize: "48px",
  textFont: "Fraunces",
  textSize: "18px",
  paddingTop: "80px",
  paddingBottom: "80px",
  align: "center",
};

const SECTION_DEFAULTS: Record<string, Partial<CmsSectionDesignValues>> = {
  "home.hero": {
    backgroundColor: "#0A0A0A",
    textColor: "#F7F1E8",
    titleColor: "#FFFFFF",
    subtitleColor: "#F7F1E8",
    titleSize: "88px",
    paddingTop: "96px",
    paddingBottom: "96px",
  },
  "home.products": {
    backgroundColor: "#F7F1E8",
    titleSize: "60px",
  },
  "home.ingredients": {
    backgroundColor: "#F7F1E8",
    titleSize: "60px",
  },
  "home.footer": {
    backgroundColor: "#0A0A0A",
    textColor: "#F7F1E8",
    titleColor: "#FFFFFF",
    subtitleColor: "#F7F1E8",
    titleSize: "24px",
    textSize: "14px",
    paddingTop: "56px",
    paddingBottom: "56px",
  },
};

const DEFAULT_BUTTON_DESIGN: Required<CmsButtonDesignValues> = {
  backgroundColor: "#0A0A0A",
  textColor: "#FFFFFF",
  borderColor: "#0A0A0A",
  borderWidth: "0px",
  borderRadius: "0px",
  fontFamily: "Archivo",
  fontSize: "14px",
  paddingX: "16px",
  paddingY: "14px",
  width: "full",
  uppercase: "on",
  shadow: "soft",
};

const BUTTON_DEFAULTS: Record<string, Partial<CmsButtonDesignValues>> = {
  "hero.primary": {
    backgroundColor: "#F7F1E8",
    textColor: "#0A0A0A",
    borderColor: "#F7F1E8",
    paddingX: "36px",
    paddingY: "16px",
    width: "auto",
  },
  "catalog.add": {
    backgroundColor: "#0A0A0A",
    textColor: "#FFFFFF",
    paddingX: "16px",
    paddingY: "14px",
    width: "full",
  },
  "catalog.detail": {
    backgroundColor: "#FFFFFF",
    textColor: "#0A0A0A",
    borderColor: "#FFFFFF",
    borderWidth: "0px",
    fontSize: "11px",
    paddingX: "0px",
    paddingY: "0px",
    width: "auto",
    shadow: "none",
  },
  "ingredients.benefits": {
    backgroundColor: "#FFFFFF",
    textColor: "#B2462F",
    borderColor: "#FFFFFF",
    borderWidth: "0px",
    fontSize: "12px",
    paddingX: "0px",
    paddingY: "0px",
    width: "auto",
    shadow: "none",
  },
  "cart.continue": {
    backgroundColor: "#0A0A0A",
    textColor: "#FFFFFF",
    paddingX: "16px",
    paddingY: "16px",
    width: "full",
  },
  "checkout.submit": {
    backgroundColor: "#0A0A0A",
    textColor: "#FFFFFF",
    paddingX: "16px",
    paddingY: "16px",
    width: "full",
  },
};

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

function sanitizeSectionValues(input: unknown): CmsSectionDesignValues {
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
    align: pick<CmsSectionDesignValues["align"] & string>(raw.align, ALIGN),
  });
}

function sanitizeButtonValues(input: unknown): CmsButtonDesignValues {
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
    width: pick<CmsButtonDesignValues["width"] & string>(raw.width, WIDTH),
    uppercase: pick<CmsButtonDesignValues["uppercase"] & string>(
      raw.uppercase,
      UPPERCASE
    ),
    shadow: pick<CmsButtonDesignValues["shadow"] & string>(raw.shadow, SHADOW),
  });
}

export function sanitizeSectionDesign(input: unknown): CmsSectionDesign {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const base = sanitizeSectionValues(raw);
  const mobile = sanitizeSectionValues(raw.mobile);
  return clean({
    ...base,
    mobile: Object.keys(mobile).length > 0 ? mobile : undefined,
  });
}

export function sanitizeButtonDesign(input: unknown): CmsButtonDesign {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const base = sanitizeButtonValues(raw);
  const mobile = sanitizeButtonValues(raw.mobile);
  return clean({
    ...base,
    mobile: Object.keys(mobile).length > 0 ? mobile : undefined,
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

export function sectionDesignDefaults(sectionKey: string): Required<CmsSectionDesignValues> {
  return {
    ...DEFAULT_SECTION_DESIGN,
    ...(SECTION_DEFAULTS[sectionKey] ?? {}),
  };
}

export function buttonDesignDefaults(buttonKey: string): Required<CmsButtonDesignValues> {
  return {
    ...DEFAULT_BUTTON_DESIGN,
    ...(BUTTON_DEFAULTS[buttonKey] ?? {}),
  };
}

export function effectiveSectionDesign(
  sectionKey: string,
  design: CmsSectionDesign | undefined,
  target: CmsDesignTarget
): Required<CmsSectionDesignValues> {
  return {
    ...sectionDesignDefaults(sectionKey),
    ...(design ?? {}),
    ...(target === "mobile" ? design?.mobile ?? {} : {}),
  };
}

export function effectiveButtonDesign(
  buttonKey: string,
  design: CmsButtonDesign | undefined,
  target: CmsDesignTarget
): Required<CmsButtonDesignValues> {
  return {
    ...buttonDesignDefaults(buttonKey),
    ...(design ?? {}),
    ...(target === "mobile" ? design?.mobile ?? {} : {}),
  };
}

export function setSectionDesignValue(
  design: CmsSectionDesign | undefined,
  target: CmsDesignTarget,
  key: keyof CmsSectionDesignValues,
  value: string
): CmsSectionDesign {
  const current = sanitizeSectionDesign(design);
  if (target === "desktop") {
    return sanitizeSectionDesign({ ...current, [key]: value });
  }
  return sanitizeSectionDesign({
    ...current,
    mobile: { ...(current.mobile ?? {}), [key]: value },
  });
}

export function setButtonDesignValue(
  design: CmsButtonDesign | undefined,
  target: CmsDesignTarget,
  key: keyof CmsButtonDesignValues,
  value: string
): CmsButtonDesign {
  const current = sanitizeButtonDesign(design);
  if (target === "desktop") {
    return sanitizeButtonDesign({ ...current, [key]: value });
  }
  return sanitizeButtonDesign({
    ...current,
    mobile: { ...(current.mobile ?? {}), [key]: value },
  });
}

export function resetSectionMobileDesign(
  design: CmsSectionDesign | undefined
): CmsSectionDesign {
  const current = sanitizeSectionDesign(design);
  const { mobile: _mobile, ...desktop } = current;
  return sanitizeSectionDesign(desktop);
}

export function resetButtonMobileDesign(
  design: CmsButtonDesign | undefined
): CmsButtonDesign {
  const current = sanitizeButtonDesign(design);
  const { mobile: _mobile, ...desktop } = current;
  return sanitizeButtonDesign(desktop);
}

export function sectionDesignToStyle(
  design?: CmsSectionDesign
): CSSProperties {
  if (!design) return {};
  return sectionValuesToStyle(design);
}

function sectionValuesToStyle(
  design?: CmsSectionDesignValues
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
  return titleValuesToStyle(design);
}

function titleValuesToStyle(
  design?: CmsSectionDesignValues
): CSSProperties {
  if (!design) return {};
  return clean({
    color: design.titleColor,
    fontFamily: design.titleFont ? `"${design.titleFont}", sans-serif` : undefined,
    fontSize: design.titleSize,
  }) as CSSProperties;
}

export function subtitleDesignToStyle(design?: CmsSectionDesign): CSSProperties {
  if (!design) return {};
  return subtitleValuesToStyle(design);
}

function subtitleValuesToStyle(
  design?: CmsSectionDesignValues
): CSSProperties {
  if (!design) return {};
  return clean({
    color: design.subtitleColor ?? design.textColor,
    fontFamily: design.textFont ? `"${design.textFont}", sans-serif` : undefined,
    fontSize: design.textSize,
  }) as CSSProperties;
}

export function buttonDesignToStyle(design?: CmsButtonDesign): CSSProperties {
  if (!design) return {};
  return buttonValuesToStyle(design);
}

function buttonValuesToStyle(
  design?: CmsButtonDesignValues
): CSSProperties {
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

function cssEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function kebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function cssDeclarations(style: CSSProperties): string {
  return Object.entries(style)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === "") return "";
      return `${kebab(key)}:${String(value)}`;
    })
    .filter(Boolean)
    .join(";");
}

export function sectionMobileCssRules({
  sectionKey,
  titleTextKey,
  subtitleTextKey,
  design,
}: {
  sectionKey: string;
  titleTextKey?: string;
  subtitleTextKey?: string;
  design?: CmsSectionDesign;
}): string {
  if (!design?.mobile) return "";
  const sectionSelector = `[data-cms-section="${cssEscape(sectionKey)}"]`;
  const rules = [
    cssDeclarations(sectionValuesToStyle(design.mobile))
      ? `${sectionSelector}{${cssDeclarations(sectionValuesToStyle(design.mobile))}}`
      : "",
    titleTextKey && cssDeclarations(titleValuesToStyle(design.mobile))
      ? `${sectionSelector} [data-cms-text="${cssEscape(titleTextKey)}"]{${cssDeclarations(
          titleValuesToStyle(design.mobile)
        )}}`
      : "",
    subtitleTextKey && cssDeclarations(subtitleValuesToStyle(design.mobile))
      ? `${sectionSelector} [data-cms-text="${cssEscape(subtitleTextKey)}"]{${cssDeclarations(
          subtitleValuesToStyle(design.mobile)
        )}}`
      : "",
  ].filter(Boolean);
  return rules.length > 0
    ? `@media (max-width: 640px){${rules.join("")}}`
    : "";
}

export function buttonMobileCssRule(
  buttonKey: string,
  design?: CmsButtonDesign
): string {
  if (!design?.mobile) return "";
  const declarations = cssDeclarations(buttonValuesToStyle(design.mobile));
  if (!declarations) return "";
  return `@media (max-width: 640px){[data-cms-button="${cssEscape(
    buttonKey
  )}"]{${declarations}}}`;
}
