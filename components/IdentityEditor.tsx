"use client";

import { useEffect, useState } from "react";
import { CMS_FONT_OPTIONS } from "@/lib/cms-fonts";
import { postCmsDraft } from "@/lib/cms-client";

// Curated Google Fonts for the typography selectors.
const FONTS = CMS_FONT_OPTIONS;

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
    title: "Etiquetas de formas de pago",
    applies:
      "El badge de precio (precio web) y los chips de precio por efectivo / transferencia en cada producto.",
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
  {
    title: "Botón de portada (Ver productos)",
    applies: 'El botón grande de la portada que lleva a los productos.',
    fields: [
      { key: "heroBtnBg", label: "Fondo" },
      { key: "heroBtnText", label: "Texto" },
    ],
  },
  {
    title: "Selector de empanado",
    applies: "Los botones para elegir empanado (Tradicional / Keto / Integral).",
    fields: [
      { key: "empanadoActiveBg", label: "Activo · fondo" },
      { key: "empanadoActiveText", label: "Activo · texto" },
      { key: "empanadoInactiveBg", label: "Inactivo · fondo" },
      { key: "empanadoInactiveText", label: "Inactivo · texto" },
      { key: "empanadoBorder", label: "Borde" },
    ],
  },
  {
    title: "Descripciones de producto",
    applies: "La descripción corta (grilla) y larga (detalle) de cada producto.",
    fields: [],
  },
];


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
  // `colors`/`styles` = local draft being edited. `saved*` = what the DB draft
  // holds. Edits update local state only; nothing is sent until "Guardar
  // cambios" is clicked. This removes the per-change request storm + flicker.
  const [colors, setColors] = useState<Colors>(colorsDraft);
  const [savedColors, setSavedColors] = useState<Colors>(colorsDraft);
  const [typo] = useState<Typo>(typographyDraft);
  const [styles, setStyles] = useState<Record<string, string>>(
    styleSettingsDraft
  );
  const [savedStyles, setSavedStyles] =
    useState<Record<string, string>>(styleSettingsDraft);
  const [logo, setLogo] = useState(logoDraft);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    JSON.stringify(colors) !== JSON.stringify(savedColors) ||
    JSON.stringify(styles) !== JSON.stringify(savedStyles);

  // Sync from props on initial load and after publish/discard/revert.
  useEffect(() => {
    setColors(colorsDraft);
    setSavedColors(colorsDraft);
  }, [colorsDraft]);
  useEffect(() => {
    setStyles(styleSettingsDraft);
    setSavedStyles(styleSettingsDraft);
  }, [styleSettingsDraft]);
  useEffect(() => {
    setLogo(logoDraft);
  }, [logoDraft]);

  // Discard: reset the editor immediately to the (published) drafts.
  useEffect(() => {
    const resetToDrafts = () => {
      setColors(colorsDraft);
      setSavedColors(colorsDraft);
      setStyles(styleSettingsDraft);
      setSavedStyles(styleSettingsDraft);
      setLogo(logoDraft);
      setSaving(false);
      setSavedTick(false);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", resetToDrafts);
    window.addEventListener("cms:drafts-discarded", resetToDrafts);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToDrafts);
      window.removeEventListener("cms:drafts-discarded", resetToDrafts);
    };
  }, [colorsDraft, styleSettingsDraft, logoDraft]);

  function flashSaved() {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  // Saves colors + style settings to the draft, in one click.
  async function saveAll() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (JSON.stringify(colors) !== JSON.stringify(savedColors)) {
        const r = await postCmsDraft("/api/admin/cms/theme", { colors });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setSavedColors(colors);
      }
      notifyDraftChanged();
      flashSaved();
    } finally {
      setSaving(false);
    }
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
      const r = await postCmsDraft("/api/admin/cms/logo", { url: d.url });
      if (r.ok) {
        notifyDraftChanged();
        flashSaved();
      } else {
        setError(r.error);
      }
    } else {
      setError(d.error || "No se pudo subir el logo.");
    }
  }

  // Contrast of text on the cream background and white text on ink.
  const textOnCream = contrastRatio(colors.ink, colors.cream);
  const whiteOnInk = contrastRatio("#ffffff", colors.ink);
  const mutedOnCream = contrastRatio(colors.muted, colors.cream);

  return (
    <div className="space-y-8">
      {/* Sticky save bar: edits stay local until you click Guardar cambios. */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-sm">
          {dirty ? (
            <span className="font-bold text-amber-700">
              Tenés cambios sin guardar
            </span>
          ) : savedTick ? (
            <span className="font-bold text-green-700">✓ Cambios guardados</span>
          ) : (
            <span className="text-muted">Editá colores y estilos del sitio</span>
          )}
          {error && (
            <span className="ml-2 font-bold text-red-700">{error}</span>
          )}
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || !dirty}
          className="rounded bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

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
                  className="w-24 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(colors[key] ?? "") ? colors[key] : "#000000"}
                  onChange={(e) =>
                    setColors({ ...colors, [key]: e.target.value })
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
              styles={styles}
              setStyles={setStyles}
            />
          ))}
        </div>
      </section>

      {/* Typography — hidden for launch. The public site uses fixed brand fonts
          (Archivo / Fraunces via next/font) that these global controls did NOT
          drive, so showing them would be a misleading "dead" control. Per-element
          fonts (Estilos de la tienda) remain available and DO affect the site.
          The saveTypo/FontSelect/WEIGHTS machinery is kept for a future tanda
          that connects global fonts properly. */}

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
  styles,
  setStyles,
}: {
  group: StyleGroup;
  colors: Colors;
  setColors: (c: Colors) => void;
  styles: Record<string, string>;
  setStyles: (s: Record<string, string>) => void;
}) {
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
                  setColors({ ...colors, [field.key]: e.target.value })
                }
                className="h-8 w-10 cursor-pointer rounded border border-line"
              />
            </span>
          </label>
        ))}
      </div>

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
  if (title === "Etiquetas de formas de pago") {
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
  if (title === "Botón de portada (Ver productos)") {
    return (
      <div className="rounded-lg bg-ink p-4">
        <span
          className="inline-block px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
          style={{
            background: colors.heroBtnBg,
            color: colors.heroBtnText,
            borderRadius: radius(s.heroBtnRadius),
            fontFamily: fontOf(s.heroBtnFont),
            fontWeight: weight(s.heroBtnWeight) ?? 700,
            textTransform: tt(s.heroBtnUppercase) ?? "uppercase",
          }}
        >
          Ver productos ↓
        </span>
      </div>
    );
  }
  if (title === "Selector de empanado") {
    const pill = (label: string, on: boolean): React.CSSProperties => ({
      background: on ? colors.empanadoActiveBg : colors.empanadoInactiveBg,
      color: on ? colors.empanadoActiveText : colors.empanadoInactiveText,
      borderColor: colors.empanadoBorder,
      borderRadius: radius(s.empanadoRadius, "9999px"),
      fontFamily: fontOf(s.empanadoFont),
      fontWeight: weight(s.empanadoWeight) ?? 700,
      textTransform: tt(s.empanadoUppercase) ?? "uppercase",
    });
    return (
      <div className={box + " flex flex-wrap gap-2"}>
        <span className="border px-3 py-1.5 text-xs" style={pill("Keto", true)}>
          Keto
        </span>
        <span className="border px-3 py-1.5 text-xs" style={pill("Integral", false)}>
          Integral
        </span>
      </div>
    );
  }
  if (title === "Descripciones de producto") {
    return (
      <div className={box}>
        <p
          className="text-sm leading-relaxed text-muted"
          style={{ fontFamily: fontOf(s.descriptionFont) }}
        >
          Milanesa de pollo empanada, lista para el horno. Ideal para una comida
          rica y rápida.
        </p>
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
