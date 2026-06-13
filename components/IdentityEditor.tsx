"use client";

import { useEffect, useState } from "react";

// Curated Google Fonts for the typography selectors.
const FONTS = [
  "Archivo",
  "Inter",
  "Poppins",
  "Montserrat",
  "Bebas Neue",
  "Playfair Display",
  "Lora",
  "Roboto",
  "Oswald",
  "Raleway",
  "Merriweather",
  "Anton",
  "Work Sans",
  "Space Grotesk",
  "DM Sans",
  "Manrope",
  "Outfit",
  "Plus Jakarta Sans",
];

const WEIGHTS = ["400", "500", "600", "700", "800", "900"];

type Colors = Record<string, string>;
type Typo = { headingFont: string; bodyFont: string; headingWeight: string };

const COLOR_LABELS: Record<string, string> = {
  ink: "Principal (negro / fondos oscuros)",
  cream: "Fondo suave",
  line: "Bordes / separadores",
  muted: "Texto secundario",
  accent: "Acento (promos)",
  bg: "Fondo principal",
  buttonBg: "Fondo de botón",
  buttonText: "Texto de botón",
};

// Phase 3 — global ecommerce style groups. Each field maps to a key in the
// theme colors JSON; defaults equal the current design, so nothing changes
// until the owner edits a color. "Where it applies" is shown to the owner.
type StyleField = { key: string; label: string };
type StyleGroup = {
  title: string;
  applies: string;
  fields: StyleField[];
};

const STYLE_GROUPS: StyleGroup[] = [
  {
    title: "Botones principales",
    applies: 'Botón "Agregar al carrito" (grilla y detalle) y "Continuar" del carrito.',
    fields: [
      { key: "buttonBg", label: "Fondo" },
      { key: "buttonText", label: "Texto" },
    ],
  },
  {
    title: "Botones secundarios",
    applies: 'Links de acción como "Ver detalle y fotos".',
    fields: [{ key: "buttonSecondaryText", label: "Texto / color del link" }],
  },
  {
    title: "Tarjetas de producto",
    applies: "El recuadro de cada producto en la grilla.",
    fields: [
      { key: "cardBg", label: "Fondo de la tarjeta" },
      { key: "cardBorder", label: "Borde de la tarjeta" },
    ],
  },
  {
    title: "Nombre de producto",
    applies: "El nombre de cada producto en la grilla.",
    fields: [{ key: "productNameText", label: "Color del nombre" }],
  },
  {
    title: "Precios",
    applies: "El precio en la grilla y en el detalle del producto.",
    fields: [
      { key: "priceText", label: "Precio normal" },
      { key: "pricePromoText", label: "Precio en oferta" },
    ],
  },
  {
    title: "Chips de pago",
    applies: "Los chips de precio por efectivo / transferencia en cada producto.",
    fields: [
      { key: "chipBg", label: "Fondo" },
      { key: "chipBorder", label: "Borde" },
      { key: "chipText", label: "Texto" },
    ],
  },
  {
    title: "Filtros de categoría",
    applies: "Los botones de filtro (Todos, Carne, Pollo…) arriba de la grilla.",
    fields: [
      { key: "filterActiveBg", label: "Fondo activo" },
      { key: "filterActiveText", label: "Texto activo" },
      { key: "filterInactiveBg", label: "Fondo inactivo" },
      { key: "filterInactiveText", label: "Texto inactivo" },
      { key: "filterBorder", label: "Borde" },
    ],
  },
  {
    title: "Etiquetas (badges)",
    applies: 'Las etiquetas sobre las fotos: "New", "Sin stock" y las de oferta.',
    fields: [
      { key: "badgeNewBg", label: "New · fondo" },
      { key: "badgeNewText", label: "New · texto" },
      { key: "badgeStockBg", label: "Sin stock · fondo" },
      { key: "badgeStockText", label: "Sin stock · texto" },
      { key: "badgePromoBg", label: "Oferta · fondo" },
      { key: "badgePromoText", label: "Oferta · texto" },
    ],
  },
];

// Non-color controls (Tanda 2) per group. Each maps to a StyleSettings key.
const RADIUS_OPTIONS = [
  { value: "", label: "Actual" },
  { value: "0px", label: "0 (recto)" },
  { value: "8px", label: "8 px" },
  { value: "12px", label: "12 px" },
  { value: "16px", label: "16 px" },
  { value: "20px", label: "20 px" },
  { value: "9999px", label: "Redondo" },
];
const WEIGHT_OPTIONS = [
  { value: "", label: "Actual" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medio" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra" },
  { value: "900", label: "Black" },
];
const SHADOW_OPTIONS = [
  { value: "", label: "Actual" },
  { value: "none", label: "Ninguna" },
  { value: "soft", label: "Suave" },
  { value: "medium", label: "Media" },
];
const BORDER_OPTIONS = [
  { value: "", label: "Actual" },
  { value: "0px", label: "Sin borde" },
  { value: "1px", label: "1 px" },
  { value: "2px", label: "2 px" },
  { value: "3px", label: "3 px" },
];
const FONT_FIELD_OPTIONS = [
  { value: "", label: "Actual" },
  ...FONTS.map((f) => ({ value: f, label: f })),
];

type StyleControl =
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "size"; key: string; label: string; placeholder: string }
  | { kind: "toggle"; key: string; label: string }; // "on"/"off"/""

// Which non-color controls each group shows (by group title).
const GROUP_CONTROLS: Record<string, StyleControl[]> = {
  "Botones principales": [
    { kind: "select", key: "buttonRadius", label: "Bordes", options: RADIUS_OPTIONS },
    { kind: "select", key: "buttonFont", label: "Fuente", options: FONT_FIELD_OPTIONS },
    { kind: "select", key: "buttonWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "buttonSize", label: "Tamaño", placeholder: "Ej: 14px" },
    { kind: "toggle", key: "buttonUppercase", label: "Mayúsculas" },
  ],
  "Botones secundarios": [
    { kind: "select", key: "buttonSecondaryFont", label: "Fuente", options: FONT_FIELD_OPTIONS },
    { kind: "select", key: "buttonSecondaryWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "buttonSecondarySize", label: "Tamaño", placeholder: "Ej: 11px" },
    { kind: "toggle", key: "buttonSecondaryUppercase", label: "Mayúsculas" },
    { kind: "toggle", key: "buttonSecondaryUnderline", label: "Subrayado" },
  ],
  "Tarjetas de producto": [
    { kind: "select", key: "cardRadius", label: "Bordes redondeados", options: RADIUS_OPTIONS },
    { kind: "select", key: "cardShadow", label: "Sombra", options: SHADOW_OPTIONS },
    { kind: "select", key: "cardBorderWidth", label: "Grosor de borde", options: BORDER_OPTIONS },
  ],
  "Nombre de producto": [
    { kind: "select", key: "nameFont", label: "Fuente", options: FONT_FIELD_OPTIONS },
    { kind: "select", key: "nameWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "nameSizeMobile", label: "Tamaño mobile", placeholder: "Ej: 16px" },
    { kind: "size", key: "nameSizeDesktop", label: "Tamaño desktop", placeholder: "Ej: 20px" },
    { kind: "toggle", key: "nameUppercase", label: "Mayúsculas" },
  ],
  Precios: [
    { kind: "select", key: "priceFont", label: "Fuente", options: FONT_FIELD_OPTIONS },
    { kind: "select", key: "priceWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "priceSizeMobile", label: "Tamaño mobile", placeholder: "Ej: 20px" },
    { kind: "size", key: "priceSizeDesktop", label: "Tamaño desktop", placeholder: "Ej: 24px" },
  ],
  "Chips de pago": [
    { kind: "select", key: "chipRadius", label: "Bordes", options: RADIUS_OPTIONS },
    { kind: "select", key: "chipWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "chipSize", label: "Tamaño", placeholder: "Ej: 11px" },
    { kind: "toggle", key: "chipUppercase", label: "Mayúsculas" },
  ],
  "Filtros de categoría": [
    { kind: "select", key: "filterRadius", label: "Bordes", options: RADIUS_OPTIONS },
    { kind: "select", key: "filterWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "filterSize", label: "Tamaño", placeholder: "Ej: 12px" },
    { kind: "toggle", key: "filterUppercase", label: "Mayúsculas" },
  ],
  "Etiquetas (badges)": [
    { kind: "select", key: "badgeRadius", label: "Bordes", options: RADIUS_OPTIONS },
    { kind: "select", key: "badgeWeight", label: "Peso", options: WEIGHT_OPTIONS },
    { kind: "size", key: "badgeSize", label: "Tamaño", placeholder: "Ej: 11px" },
    { kind: "toggle", key: "badgeUppercase", label: "Mayúsculas" },
  ],
};

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

// --- WCAG contrast -----------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: string, b: string): number | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const la = luminance(ra);
  const lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export default function IdentityEditor({
  colorsDraft,
  typographyDraft,
  styleSettingsDraft,
  logoDraft,
}: {
  colorsDraft: Colors;
  typographyDraft: Typo;
  styleSettingsDraft: Record<string, string>;
  logoDraft: string;
}) {
  const [colors, setColors] = useState<Colors>(colorsDraft);
  const [typo, setTypo] = useState<Typo>(typographyDraft);
  const [styles, setStyles] = useState<Record<string, string>>(
    styleSettingsDraft
  );
  const [logo, setLogo] = useState(logoDraft);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  async function saveStyles(next: Record<string, string>) {
    setStyles(next);
    const res = await fetch("/api/admin/cms/style-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styles: next }),
    });
    setSavingMsg(res.ok ? "Estilos guardados ✓" : "Error al guardar");
    if (res.ok) notifyDraftChanged();
    setTimeout(() => setSavingMsg(null), 1200);
  }

  async function saveColors(next: Colors) {
    setColors(next);
    const res = await fetch("/api/admin/cms/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colors: next }),
    });
    setSavingMsg(res.ok ? "Colores guardados ✓" : "Error al guardar");
    if (res.ok) notifyDraftChanged();
    setTimeout(() => setSavingMsg(null), 1200);
  }

  async function saveTypo(next: Typo) {
    setTypo(next);
    await fetch("/api/admin/cms/typography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typography: next }),
    });
    notifyDraftChanged();
    setSavingMsg("Tipografía guardada ✓");
    setTimeout(() => setSavingMsg(null), 1200);
  }

  async function onLogoFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "branding");
    const res = await fetch("/api/admin/cms/upload", {
      method: "POST",
      body: fd,
    });
    const d = await res.json();
    if (res.ok && d.url) {
      setLogo(d.url);
      await fetch("/api/admin/cms/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: d.url }),
      });
      notifyDraftChanged();
      setSavingMsg("Logo guardado ✓");
      setTimeout(() => setSavingMsg(null), 1200);
    } else {
      alert(d.error || "No se pudo subir el logo.");
    }
  }

  // Contrast of text on the cream background and white text on ink.
  const textOnCream = contrastRatio(colors.ink, colors.cream);
  const whiteOnInk = contrastRatio("#ffffff", colors.ink);
  const mutedOnCream = contrastRatio(colors.muted, colors.cream);

  return (
    <div className="space-y-8">
      {savingMsg && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {savingMsg}
        </p>
      )}

      {/* Colors */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Paleta global
            </p>
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Colores
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Usá colores con buen contraste para que la tienda siga siendo
            legible en mobile y desktop.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            "ink",
            "cream",
            "line",
            "muted",
            "accent",
            "bg",
            "buttonBg",
            "buttonText",
          ].map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
            >
              <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
                {COLOR_LABELS[key] ?? key}
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="text"
                  value={colors[key] ?? ""}
                  onChange={(e) =>
                    setColors({ ...colors, [key]: e.target.value })
                  }
                  onBlur={() => saveColors(colors)}
                  className="w-24 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(colors[key] ?? "") ? colors[key] : "#000000"}
                  onChange={(e) =>
                    saveColors({ ...colors, [key]: e.target.value })
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-line"
                />
              </span>
            </label>
          ))}
        </div>

        {/* Contrast warnings (WCAG AA needs >= 4.5 for normal text) */}
        <div className="mt-3 space-y-1">
          <ContrastNote label="Texto sobre fondo suave" ratio={textOnCream} />
          <ContrastNote label="Texto blanco sobre principal" ratio={whiteOnInk} />
          <ContrastNote label="Texto secundario sobre fondo suave" ratio={mutedOnCream} />
        </div>

        {/* Live preview */}
        <div
          className="mt-4 rounded-xl border border-line p-5"
          style={{ background: colors.cream }}
        >
          <p
            className="font-black uppercase tracking-tight text-2xl"
            style={{ color: colors.ink }}
          >
            Vista previa
          </p>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            Texto secundario de ejemplo.
          </p>
          <div className="mt-3 flex gap-2">
            <span
              className="rounded px-4 py-2 font-bold uppercase tracking-widest text-xs"
              style={{ background: colors.buttonBg, color: colors.buttonText }}
            >
              Botón
            </span>
            <span
              className="rounded px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
              style={{ background: colors.accent }}
            >
              Promo
            </span>
          </div>
        </div>
      </section>

      {/* Phase 3 — global ecommerce style groups */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 border-b border-line pb-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Estilos de la tienda
          </p>
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Botones, tarjetas, precios y etiquetas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Cambiá los colores de los elementos de venta. Cada cambio queda en
            borrador y se ve en el sitio recién cuando publicás. Si no tocás
            nada, todo se ve como ahora.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {STYLE_GROUPS.map((group) => (
            <StyleGroupSection
              key={group.title}
              group={group}
              colors={colors}
              setColors={setColors}
              saveColors={saveColors}
              styles={styles}
              saveStyles={saveStyles}
            />
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Fuentes globales
            </p>
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Tipografía
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Estos ajustes afectan títulos y textos principales del sitio cuando
            se publican.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FontSelect
            label="Títulos"
            value={typo.headingFont}
            onChange={(v) => saveTypo({ ...typo, headingFont: v })}
          />
          <FontSelect
            label="Cuerpo"
            value={typo.bodyFont}
            onChange={(v) => saveTypo({ ...typo, bodyFont: v })}
          />
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
              Peso de títulos
            </span>
            <select
              value={typo.headingWeight}
              onChange={(e) =>
                saveTypo({ ...typo, headingWeight: e.target.value })
              }
              className="w-full rounded border border-line bg-white px-3 py-2 text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* Live preview (loads the chosen fonts on the fly) */}
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            typo.headingFont
          )}:wght@${typo.headingWeight}&family=${encodeURIComponent(
            typo.bodyFont
          )}&display=swap`}
          rel="stylesheet"
        />
        <div className="mt-4 rounded-xl border border-line bg-cream/30 p-5">
          <p
            className="uppercase tracking-tight text-3xl"
            style={{
              fontFamily: `'${typo.headingFont}', sans-serif`,
              fontWeight: Number(typo.headingWeight),
            }}
          >
            Milanesas Premium
          </p>
          <p
            className="mt-2 text-base text-muted"
            style={{ fontFamily: `'${typo.bodyFont}', sans-serif` }}
          >
            De nuestra cocina a tu freezer. Elegí tu corte y tu empanado.
          </p>
        </div>
      </section>

      {/* Logo */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Imagen de marca
            </p>
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Logo
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Si no hay logo cargado, el sitio usa el logo actual como fallback.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-cream/30 p-4">
          <div
            className="flex h-20 w-40 items-center justify-center rounded border border-line bg-cream/40"
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" className="max-h-16 max-w-36 object-contain" />
            ) : (
              <span className="text-xs text-muted">Sin logo</span>
            )}
          </div>
          <label className="cursor-pointer rounded bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white">
            Subir logo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogoFile(f);
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

// One ecommerce style group: its color fields + a live preview that uses the
// currently selected colors (never hardcoded).
function StyleGroupSection({
  group,
  colors,
  setColors,
  saveColors,
  styles,
  saveStyles,
}: {
  group: StyleGroup;
  colors: Colors;
  setColors: (c: Colors) => void;
  saveColors: (c: Colors) => void;
  styles: Record<string, string>;
  saveStyles: (s: Record<string, string>) => void;
}) {
  const controls = GROUP_CONTROLS[group.title] ?? [];
  const set = (key: string, value: string) =>
    saveStyles({ ...styles, [key]: value });
  return (
    <div className="rounded-xl border border-line bg-cream/25 p-4">
      <h3 className="font-black uppercase tracking-tight text-sm text-ink">
        {group.title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted">
        Se aplica en: {group.applies}
      </p>
      <div className="mt-3 space-y-2">
        {group.fields.map((field) => (
          <label
            key={field.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-2.5"
          >
            <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
              {field.label}
            </span>
            <span className="flex items-center gap-2">
              <input
                type="text"
                value={colors[field.key] ?? ""}
                onChange={(e) =>
                  setColors({ ...colors, [field.key]: e.target.value })
                }
                onBlur={() => saveColors(colors)}
                className="w-24 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink"
              />
              <input
                type="color"
                value={
                  /^#[0-9a-f]{6}$/i.test(colors[field.key] ?? "")
                    ? colors[field.key]
                    : "#000000"
                }
                onChange={(e) =>
                  saveColors({ ...colors, [field.key]: e.target.value })
                }
                className="h-8 w-10 cursor-pointer rounded border border-line"
              />
            </span>
          </label>
        ))}
      </div>

      {controls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {controls.map((c) => {
            const value = styles[c.key] ?? "";
            if (c.kind === "select") {
              return (
                <label key={c.key} className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    {c.label}
                  </span>
                  <select
                    value={value}
                    onChange={(e) => set(c.key, e.target.value)}
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
                  >
                    {c.options.map((o) => (
                      <option key={o.value || "default"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            if (c.kind === "size") {
              return (
                <SizeInput
                  key={c.key}
                  label={c.label}
                  value={value}
                  placeholder={c.placeholder}
                  onCommit={(v) => set(c.key, v)}
                />
              );
            }
            // toggle
            return (
              <label
                key={c.key}
                className="flex items-center gap-2 self-end rounded border border-line bg-white px-2 py-2 text-sm font-bold text-ink"
              >
                <input
                  type="checkbox"
                  checked={value === "on"}
                  onChange={(e) => set(c.key, e.target.checked ? "on" : "off")}
                  className="h-4 w-4 accent-black"
                />
                {c.label}
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
          Vista rápida
        </p>
        <GroupPreview title={group.title} colors={colors} styles={styles} />
      </div>
    </div>
  );
}

// Small px-size input that only commits a valid "<n>px" value (or "" to clear).
function SizeInput({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const v = local.trim();
          if (v === "" || /^\d{1,2}(\.\d{1,2})?px$/.test(v)) onCommit(v);
          else setLocal(value); // revert invalid input
        }}
        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
      />
    </label>
  );
}

// Live preview per group, rendered with the selected colors.
// Helpers to translate style settings into preview CSS (fallback = current).
function radius(v?: string, fb = "0px") {
  return v ? v : fb;
}
function weight(v?: string): number | undefined {
  return v ? Number(v) : undefined;
}
function fontOf(v?: string) {
  return v ? `'${v}', sans-serif` : undefined;
}
function tt(v?: string): "uppercase" | "none" | undefined {
  if (v === "on") return "uppercase";
  if (v === "off") return "none";
  return undefined;
}
const SHADOW_PREVIEW: Record<string, string> = {
  none: "none",
  soft: "0 1px 0 rgba(10,10,10,0.06)",
  medium: "0 8px 20px rgba(10,10,10,0.12)",
};

function GroupPreview({
  title,
  colors,
  styles,
}: {
  title: string;
  colors: Colors;
  styles: Record<string, string>;
}) {
  const s = styles;
  const box = "rounded-lg border border-line bg-white p-3";
  if (title === "Botones principales") {
    return (
      <div className={box}>
        <span
          className="inline-block px-4 py-2 text-xs font-bold uppercase tracking-widest"
          style={{
            background: colors.buttonBg,
            color: colors.buttonText,
            borderRadius: radius(s.buttonRadius),
            fontFamily: fontOf(s.buttonFont),
            fontWeight: weight(s.buttonWeight) ?? 700,
            fontSize: s.buttonSize || undefined,
            textTransform: tt(s.buttonUppercase) ?? "uppercase",
          }}
        >
          Agregar al carrito
        </span>
      </div>
    );
  }
  if (title === "Botones secundarios") {
    return (
      <div className={box}>
        <span
          className="underline-offset-4"
          style={{
            color: colors.buttonSecondaryText,
            fontFamily: fontOf(s.buttonSecondaryFont),
            fontWeight: weight(s.buttonSecondaryWeight) ?? 700,
            fontSize: s.buttonSecondarySize || "11px",
            textTransform: tt(s.buttonSecondaryUppercase) ?? "uppercase",
            textDecoration:
              s.buttonSecondaryUnderline === "off" ? "none" : "underline",
          }}
        >
          Ver detalle y fotos →
        </span>
      </div>
    );
  }
  if (title === "Tarjetas de producto") {
    return (
      <div
        className="border p-3"
        style={{
          background: colors.cardBg,
          borderColor: colors.cardBorder,
          borderRadius: radius(s.cardRadius, "0.5rem"),
          borderWidth: s.cardBorderWidth || "1px",
          boxShadow: s.cardShadow ? SHADOW_PREVIEW[s.cardShadow] : undefined,
        }}
      >
        <div className="h-10 rounded bg-cream/60" />
        <p
          className="mt-2 text-xs font-black uppercase tracking-tight"
          style={{ color: colors.productNameText }}
        >
          Milanesa de pollo
        </p>
      </div>
    );
  }
  if (title === "Nombre de producto") {
    return (
      <div className={box}>
        <p
          className="text-sm font-black uppercase tracking-tight"
          style={{
            color: colors.productNameText,
            fontFamily: fontOf(s.nameFont),
            fontWeight: weight(s.nameWeight) ?? 900,
            fontSize: s.nameSizeDesktop || s.nameSizeMobile || undefined,
            textTransform: tt(s.nameUppercase) ?? "uppercase",
          }}
        >
          Peceto de pastura
        </p>
      </div>
    );
  }
  if (title === "Precios") {
    const priceStyle: React.CSSProperties = {
      fontFamily: fontOf(s.priceFont),
      fontWeight: weight(s.priceWeight) ?? 900,
      fontSize: s.priceSizeDesktop || s.priceSizeMobile || undefined,
    };
    return (
      <div className={box + " flex items-baseline gap-3"}>
        <span className="text-lg font-black" style={{ color: colors.priceText, ...priceStyle }}>
          $ 9.900
        </span>
        <span className="text-lg font-black" style={{ color: colors.pricePromoText, ...priceStyle }}>
          $ 7.900
        </span>
      </div>
    );
  }
  if (title === "Chips de pago") {
    return (
      <div className={box + " flex flex-wrap gap-2"}>
        {["efectivo", "transf."].map((l) => (
          <span
            key={l}
            className="inline-flex items-baseline gap-1 border px-2.5 py-1"
            style={{
              background: colors.chipBg,
              borderColor: colors.chipBorder,
              color: colors.chipText,
              borderRadius: radius(s.chipRadius, "9999px"),
              fontWeight: weight(s.chipWeight) ?? 700,
              fontSize: s.chipSize || undefined,
              textTransform: tt(s.chipUppercase) ?? "none",
            }}
          >
            <span className="font-black">$ 7.900</span>
            <span>{l}</span>
          </span>
        ))}
      </div>
    );
  }
  if (title === "Filtros de categoría") {
    const fStyle: React.CSSProperties = {
      borderRadius: radius(s.filterRadius, "9999px"),
      fontWeight: weight(s.filterWeight) ?? 700,
      fontSize: s.filterSize || "11px",
      textTransform: tt(s.filterUppercase) ?? "uppercase",
    };
    return (
      <div className={box + " flex flex-wrap gap-2"}>
        <span
          className="border px-3 py-1.5 font-bold uppercase tracking-wide"
          style={{
            background: colors.filterActiveBg,
            borderColor: colors.filterActiveBg,
            color: colors.filterActiveText,
            ...fStyle,
          }}
        >
          Todos
        </span>
        <span
          className="border px-3 py-1.5 font-bold uppercase tracking-wide"
          style={{
            background: colors.filterInactiveBg,
            borderColor: colors.filterBorder,
            color: colors.filterInactiveText,
            ...fStyle,
          }}
        >
          Pollo
        </span>
      </div>
    );
  }
  if (title === "Etiquetas (badges)") {
    const bStyle: React.CSSProperties = {
      borderRadius: radius(s.badgeRadius),
      fontWeight: weight(s.badgeWeight) ?? 700,
      fontSize: s.badgeSize || "10px",
      textTransform: tt(s.badgeUppercase) ?? "uppercase",
    };
    return (
      <div className={box + " flex flex-wrap gap-2"}>
        <span
          className="px-2 py-1 font-black uppercase tracking-widest"
          style={{ background: colors.badgeNewBg, color: colors.badgeNewText, ...bStyle }}
        >
          New
        </span>
        <span
          className="px-2 py-1 font-black uppercase tracking-widest"
          style={{ background: colors.badgeStockBg, color: colors.badgeStockText, ...bStyle }}
        >
          Sin stock
        </span>
        <span
          className="px-2 py-1 font-black uppercase tracking-widest"
          style={{ background: colors.badgePromoBg, color: colors.badgePromoText, ...bStyle }}
        >
          -20%
        </span>
      </div>
    );
  }
  return null;
}

function ContrastNote({
  label,
  ratio,
}: {
  label: string;
  ratio: number | null;
}) {
  if (ratio === null) return null;
  const ok = ratio >= 4.5;
  return (
    <p
      className={`flex items-center justify-between rounded px-3 py-1.5 text-xs ${
        ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      <span>{label}</span>
      <span className="font-bold tabular-nums">
        {ratio.toFixed(2)}:1 {ok ? "✓ AA" : "⚠ contraste bajo"}
      </span>
    </p>
  );
}

function FontSelect({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded border border-line bg-white px-3 py-2 text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}
