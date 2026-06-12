"use client";

import { useState } from "react";

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
  logoDraft,
}: {
  colorsDraft: Colors;
  typographyDraft: Typo;
  logoDraft: string;
}) {
  const [colors, setColors] = useState<Colors>(colorsDraft);
  const [typo, setTypo] = useState<Typo>(typographyDraft);
  const [logo, setLogo] = useState(logoDraft);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

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
