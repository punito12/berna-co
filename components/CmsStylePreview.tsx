"use client";

import {
  cmsTextStyleToInlineCss,
  type CmsTextStyle,
} from "@/lib/cms-text-styles";

// Small in-editor live preview of a text rendered with the currently selected
// style (font, weight, size, italic, uppercase, line-height, letter-spacing).
// Display-only: it never changes saved values or public rendering. Updates
// immediately as the owner tweaks the style controls.
export default function CmsStylePreview({
  text,
  style,
}: {
  text: string;
  style: CmsTextStyle;
}) {
  const sample = text.trim() || "Texto de ejemplo";
  const css = cmsTextStyleToInlineCss(style);
  return (
    <div className="mt-3 rounded-lg border border-line bg-cream/40 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
        Vista rápida del estilo
      </p>
      <div
        className="break-words text-ink"
        style={css}
      >
        {sample}
      </div>
    </div>
  );
}
