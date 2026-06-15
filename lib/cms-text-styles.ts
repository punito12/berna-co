import { CMS_FONT_SET } from "@/lib/cms-fonts";

export type CmsTextStyle = {
  fontFamily?: string;
  fontSize?: string;
  fontSizeMobile?: string;
  fontWeight?: string;
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  color?: string;
  textAlign?: string;
  lineHeight?: string;
  letterSpacing?: string;
};

const ALLOWED_WEIGHTS = new Set(["300", "400", "500", "600", "700", "800", "900"]);
const ALLOWED_ALIGN = new Set(["left", "center", "right"]);
const SIZE_RE = /^\d{1,3}(\.\d{1,2})?(px|rem|em)$/;
const LINE_HEIGHT_RE = /^(\d{1,2}(\.\d{1,2})?|\d{1,3}(\.\d{1,2})?px)$/;
const LETTER_SPACING_RE = /^-?\d{1,2}(\.\d{1,2})?(px|em|rem)$/;
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function parseTextStyle(raw: string): CmsTextStyle {
  return sanitizeTextStyle(parseObject(raw));
}

export function sanitizeTextStyle(input: Record<string, unknown>): CmsTextStyle {
  const out: CmsTextStyle = {};
  if (typeof input.fontFamily === "string" && CMS_FONT_SET.has(input.fontFamily)) {
    out.fontFamily = input.fontFamily;
  }
  if (typeof input.fontSize === "string" && SIZE_RE.test(input.fontSize)) {
    out.fontSize = input.fontSize;
  }
  if (
    typeof input.fontSizeMobile === "string" &&
    SIZE_RE.test(input.fontSizeMobile)
  ) {
    out.fontSizeMobile = input.fontSizeMobile;
  }
  if (typeof input.fontWeight === "string" && ALLOWED_WEIGHTS.has(input.fontWeight)) {
    out.fontWeight = input.fontWeight;
  }
  if (input.italic === true) out.italic = true;
  if (input.underline === true) out.underline = true;
  if (input.uppercase === true) out.uppercase = true;
  if (typeof input.color === "string" && COLOR_RE.test(input.color)) {
    out.color = input.color;
  }
  if (typeof input.textAlign === "string" && ALLOWED_ALIGN.has(input.textAlign)) {
    out.textAlign = input.textAlign;
  }
  if (typeof input.lineHeight === "string" && LINE_HEIGHT_RE.test(input.lineHeight)) {
    out.lineHeight = input.lineHeight;
  }
  if (
    typeof input.letterSpacing === "string" &&
    LETTER_SPACING_RE.test(input.letterSpacing)
  ) {
    out.letterSpacing = input.letterSpacing;
  }
  return out;
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function declarations(style: CmsTextStyle, mobile = false): string {
  const size = mobile ? style.fontSizeMobile : style.fontSize;
  return [
    style.fontFamily ? `font-family:"${cssEscape(style.fontFamily)}", sans-serif` : "",
    size ? `font-size:${size}` : "",
    style.fontWeight ? `font-weight:${style.fontWeight}` : "",
    style.italic ? "font-style:italic" : "",
    style.underline ? "text-decoration:underline" : "",
    style.uppercase ? "text-transform:uppercase" : "",
    style.color ? `color:${style.color}` : "",
    style.textAlign ? `text-align:${style.textAlign}` : "",
    style.lineHeight ? `line-height:${style.lineHeight}` : "",
    style.letterSpacing ? `letter-spacing:${style.letterSpacing}` : "",
  ]
    .filter(Boolean)
    .join(";");
}

// Turns a CmsTextStyle into a React inline-style object for the in-editor quick
// preview. Uses the DESKTOP size. Display-only — never affects what's saved or
// how the public site renders (that goes through textStyleCssRule).
export function cmsTextStyleToInlineCss(
  style: CmsTextStyle
): Record<string, string> {
  const css: Record<string, string> = {};
  if (style.fontFamily) css.fontFamily = `"${style.fontFamily}", sans-serif`;
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.italic) css.fontStyle = "italic";
  if (style.underline) css.textDecoration = "underline";
  if (style.uppercase) css.textTransform = "uppercase";
  if (style.color) css.color = style.color;
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  return css;
}

export function textStyleCssRule(key: string, style: CmsTextStyle): string {
  const base = declarations(style);
  const mobile = style.fontSizeMobile ? declarations(style, true) : "";
  const selector = `[data-cms-text="${cssEscape(key)}"]`;
  return [
    base ? `${selector}{${base}}` : "",
    mobile ? `@media (max-width: 640px){${selector}{${mobile}}}` : "",
  ]
    .filter(Boolean)
    .join("");
}
