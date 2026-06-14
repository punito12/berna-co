"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseBlockConfig,
  sanitizeBlockConfig,
} from "@/lib/cms-blocks";
import { postCmsDraft, notifyCmsDraftChanged } from "@/lib/cms-client";
import {
  effectiveCardDesign,
  effectiveChipDesign,
  resetCardMobileDesign,
  resetFilterMobileDesign,
  setCardDesignValue,
  setFilterDesignValue,
  type CmsCardDesign,
  type CmsCardDesignValues,
  type CmsChipDesignValues,
  type CmsDesignTarget,
  type CmsFilterDesign,
} from "@/lib/cms-design";

// Panel de diseño de catálogo (fase 3) para el editor visual. Edita el diseño de
// las TARJETAS de producto o de los CHIPS de filtro. Ambos se guardan en el
// config de la sección home.products (host del catálogo) con la misma API y
// sanitizado del CMS clásico. Respeta el toggle Computadora/Celular: en celular
// edita el override mobile y muestra el valor efectivo heredado.

const SHADOW_OPTS = [
  { value: "none", label: "Sin sombra" },
  { value: "soft", label: "Suave" },
  { value: "medium", label: "Media" },
];

type CardField = {
  key: keyof CmsCardDesignValues;
  label: string;
  kind: "color" | "px" | "border" | "radius" | "shadow";
};
const CARD_FIELDS: CardField[] = [
  { key: "backgroundColor", label: "Fondo de tarjeta", kind: "color" },
  { key: "borderColor", label: "Borde", kind: "color" },
  { key: "borderWidth", label: "Grosor de borde", kind: "border" },
  { key: "borderRadius", label: "Radio", kind: "radius" },
  { key: "shadow", label: "Sombra", kind: "shadow" },
  { key: "padding", label: "Relleno", kind: "px" },
  { key: "titleColor", label: "Color del título", kind: "color" },
  { key: "titleFontSize", label: "Tamaño del título", kind: "px" },
  { key: "textColor", label: "Color del texto", kind: "color" },
  { key: "textFontSize", label: "Tamaño del texto", kind: "px" },
  { key: "imageBackgroundColor", label: "Fondo del área de imagen", kind: "color" },
  { key: "imagePadding", label: "Relleno del área de imagen", kind: "px" },
];

type ChipField = { key: keyof CmsChipDesignValues; label: string; kind: "color" | "radius" | "px" };
const CHIP_FIELDS: ChipField[] = [
  { key: "backgroundColor", label: "Fondo", kind: "color" },
  { key: "textColor", label: "Texto", kind: "color" },
  { key: "borderColor", label: "Borde", kind: "color" },
  { key: "borderRadius", label: "Radio", kind: "radius" },
  { key: "paddingX", label: "Relleno horizontal", kind: "px" },
  { key: "paddingY", label: "Relleno vertical", kind: "px" },
];
const CHIP_ACTIVE_FIELDS: ChipField[] = [
  { key: "backgroundColor", label: "Fondo", kind: "color" },
  { key: "textColor", label: "Texto", kind: "color" },
  { key: "borderColor", label: "Borde", kind: "color" },
];

export default function CatalogDesignPanel({
  which,
  productsConfigDraft,
  designTarget = "desktop",
}: {
  which: "cards" | "filters";
  productsConfigDraft: string;
  designTarget?: CmsDesignTarget;
}) {
  const baseConfig = useMemo(
    () => parseBlockConfig(productsConfigDraft),
    [productsConfigDraft]
  );
  const [cards, setCards] = useState<CmsCardDesign | undefined>(baseConfig.cards);
  const [filters, setFilters] = useState<CmsFilterDesign | undefined>(
    baseConfig.filters
  );
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync desde props + reset en discard global.
  useEffect(() => {
    setCards(baseConfig.cards);
    setFilters(baseConfig.filters);
  }, [baseConfig]);
  useEffect(() => {
    const reset = () => {
      setCards(baseConfig.cards);
      setFilters(baseConfig.filters);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", reset);
    window.addEventListener("cms:drafts-discarded", reset);
    return () => {
      window.removeEventListener("cms:drafts-discarding", reset);
      window.removeEventListener("cms:drafts-discarded", reset);
    };
  }, [baseConfig]);

  const dirty =
    JSON.stringify(cards ?? null) !== JSON.stringify(baseConfig.cards ?? null) ||
    JSON.stringify(filters ?? null) !== JSON.stringify(baseConfig.filters ?? null);

  // Guarda el config completo (preservando todo lo demás) en home.products.
  async function save() {
    if (saving || !dirty) return;
    const next = { ...baseConfig, cards, filters };
    const safe = sanitizeBlockConfig(next as Record<string, unknown>);
    setSaving(true);
    setError(null);
    try {
      const r = await postCmsDraft("/api/admin/cms/sections/config", {
        key: "home.products",
        config: safe,
      });
      if (r.ok) {
        notifyCmsDraftChanged();
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1500);
      } else {
        setError(r.error);
      }
    } finally {
      setSaving(false);
    }
  }

  // Resumen escaneable de los valores efectivos (para ver sin abrir todo).
  const summary = useMemo(() => {
    if (which === "cards") {
      const e = effectiveCardDesign(cards, designTarget);
      return `Fondo ${e.backgroundColor} · Radio ${e.borderRadius} · Relleno ${e.padding}`;
    }
    const e = effectiveChipDesign(filters?.chipActive, true, designTarget);
    return `Chip activo: fondo ${e.backgroundColor} · texto ${e.textColor}`;
  }, [which, cards, filters, designTarget]);

  return (
    <div className="space-y-4">
      {/* Badge responsive consistente (computadora / celular). */}
      <div
        className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
          designTarget === "mobile"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-line bg-cream/40 text-muted"
        }`}
      >
        <p className="font-bold">
          {designTarget === "mobile"
            ? "Editando diseño móvil"
            : "Editando diseño de computadora"}
        </p>
        {designTarget === "mobile" && (
          <p className="mt-0.5">Los valores vacíos heredan de computadora.</p>
        )}
        <p className="mt-1 text-[11px] text-muted">{summary}</p>
      </div>

      {which === "cards" ? (
        <div className="grid gap-3">
          {CARD_FIELDS.map((f) => {
            const eff = effectiveCardDesign(cards, designTarget);
            return (
              <DesignRow
                key={f.key}
                label={f.label}
                kind={f.kind}
                value={String(eff[f.key] ?? "")}
                onChange={(v) =>
                  setCards((c) => setCardDesignValue(c, designTarget, f.key, v))
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Chip inactivo
            </p>
            <div className="grid gap-3">
              {CHIP_FIELDS.map((f) => {
                const eff = effectiveChipDesign(filters?.chip, false, designTarget);
                return (
                  <DesignRow
                    key={f.key}
                    label={f.label}
                    kind={f.kind}
                    value={String(eff[f.key] ?? "")}
                    onChange={(v) =>
                      setFilters((d) =>
                        setFilterDesignValue(d, "chip", designTarget, f.key, v)
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Chip activo
            </p>
            <div className="grid gap-3">
              {CHIP_ACTIVE_FIELDS.map((f) => {
                const eff = effectiveChipDesign(
                  filters?.chipActive,
                  true,
                  designTarget
                );
                return (
                  <DesignRow
                    key={f.key}
                    label={f.label}
                    kind={f.kind}
                    value={String(eff[f.key] ?? "")}
                    onChange={(v) =>
                      setFilters((d) =>
                        setFilterDesignValue(d, "chipActive", designTarget, f.key, v)
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-full bg-ink px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Guardando…"
            : which === "cards"
            ? "Guardar tarjetas"
            : "Guardar filtros"}
        </button>
        <span
          className={`text-[11px] font-bold ${
            dirty ? "text-amber-700" : savedTick ? "text-green-700" : "text-muted"
          }`}
        >
          {dirty ? "Sin guardar" : savedTick ? "✓ Guardado" : "Sin cambios"}
        </span>
        {error && <span className="text-[11px] font-bold text-red-700">{error}</span>}
      </div>

      {/* Resets, cerca del grupo que reinician. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
        {designTarget === "mobile" && (
          <button
            type="button"
            onClick={() => {
              if (which === "cards") setCards((c) => resetCardMobileDesign(c));
              else setFilters((d) => resetFilterMobileDesign(d));
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
          >
            Restablecer diseño móvil
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (which === "cards") setCards(undefined);
            else setFilters(undefined);
          }}
          className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          {which === "cards" ? "Restablecer tarjetas" : "Restablecer filtros"}
        </button>
        <p className="w-full text-[10px] leading-4 text-muted">
          Esto no borra textos, links ni acciones.
        </p>
      </div>
    </div>
  );
}

function DesignRow({
  label,
  kind,
  value,
  onChange,
}: {
  label: string;
  kind: "color" | "px" | "border" | "radius" | "shadow";
  value: string;
  onChange: (value: string) => void;
}) {
  if (kind === "shadow") {
    return (
      <Labeled label={label}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {SHADOW_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Labeled>
    );
  }
  if (kind === "color") {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
    return (
      <Labeled label={label}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line"
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            placeholder="#000000"
          />
        </div>
      </Labeled>
    );
  }
  // px / border / radius → number + "px" (radio acepta 9999px = redondo).
  const num = value.replace("px", "");
  return (
    <Labeled label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={num}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}px` : "0px")}
          className={inputClass}
        />
        <span className="text-xs text-muted">px</span>
      </div>
    </Labeled>
  );
}

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
