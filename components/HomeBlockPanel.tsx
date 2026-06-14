"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  parseBlockConfig,
  sanitizeBlockConfig,
  type CmsBlockConfig,
} from "@/lib/cms-blocks";
import { postCmsDraft, notifyCmsDraftChanged } from "@/lib/cms-client";
import { CMS_FONT_OPTIONS } from "@/lib/cms-fonts";
import {
  effectiveButtonDesign,
  effectiveSectionDesign,
  resetButtonMobileDesign,
  resetSectionMobileDesign,
  sanitizeButtonDesign,
  sanitizeSectionDesign,
  setButtonDesignValue,
  setSectionDesignValue,
  type CmsDesignTarget,
  type CmsButtonDesign,
  type CmsButtonDesignValues,
  type CmsSectionDesign,
  type CmsSectionDesignValues,
} from "@/lib/cms-design";

// Panel limpio y owner-friendly para editar una sección-bloque del Home dentro
// del editor visual. Regla importante: si un texto visible ya existe como
// SiteText en el CMS clásico, se guarda en esa misma key draft. El config de la
// sección queda para imágenes/layout/opciones que no son texto compartido.

type FieldKind = "text" | "image";
type Field = { name: keyof CmsBlockConfig; label: string; kind: FieldKind };
export type HomeBlockBoundTextField =
  | "eyebrow"
  | "title"
  | "subtitle"
  | "body"
  | "ctaLabel"
  | "ctaHref"
  | "imageUrl"
  | "imageAlt"
  | "mapSrc";
export type HomeBlockTextBinding =
  | {
      kind: "field";
      field: HomeBlockBoundTextField;
      key: string;
      published: string;
      draft: string;
    }
  | {
      kind: "itemTitle";
      index: number;
      key: string;
      published: string;
      draft: string;
    };

// Campos visibles (contenido) por sección del Home, con etiquetas humanas.
const SECTION_FIELDS: Record<string, { intro: string; fields: Field[]; itemTitles?: number }> = {
  "home.hero": {
    intro: "Lo primero que ve el cliente al entrar.",
    fields: [
      { name: "title", label: "Título principal", kind: "text" },
      { name: "subtitle", label: "Subtítulo", kind: "text" },
      { name: "ctaLabel", label: "Texto del botón", kind: "text" },
      { name: "ctaHref", label: "Link del botón", kind: "text" },
      { name: "imageUrl", label: "Imagen de portada", kind: "image" },
    ],
  },
  "home.products": {
    intro: "Encabezado de la grilla de productos.",
    fields: [
      { name: "eyebrow", label: "Bajada (arriba del título)", kind: "text" },
      { name: "title", label: "Título", kind: "text" },
      { name: "subtitle", label: "Subtítulo", kind: "text" },
    ],
  },
  "home.ingredients": {
    intro: "Encabezado y tarjetas de “Nuestros ingredientes”.",
    fields: [
      { name: "eyebrow", label: "Bajada (arriba del título)", kind: "text" },
      { name: "title", label: "Título", kind: "text" },
    ],
    itemTitles: 3,
  },
  "home.footer": {
    intro: "Diseño general del pie de página.",
    fields: [],
  },
};

const SECTION_BUTTONS: Record<string, { key: string; label: string }[]> = {
  "home.hero": [{ key: "hero.primary", label: "Botón principal" }],
  "home.products": [
    { key: "catalog.add", label: "Agregar al carrito" },
    { key: "catalog.detail", label: "Ver detalle y fotos" },
    { key: "cart.continue", label: "Continuar carrito" },
  ],
  "home.ingredients": [{ key: "ingredients.benefits", label: "Ver beneficios" }],
};

export default function HomeBlockPanel({
  sectionKey,
  configDraft,
  textBindings = [],
  selectedButton,
  selectedTextKey,
  designTarget = "desktop",
}: {
  sectionKey: string;
  configDraft: string;
  textBindings?: HomeBlockTextBinding[];
  selectedButton?: string | null;
  selectedTextKey?: string | null;
  designTarget?: CmsDesignTarget;
}) {
  const router = useRouter();
  const spec = SECTION_FIELDS[sectionKey];
  // Config base completa (no perder textStyles/imageAlt/etc al guardar).
  const rawConfig = useMemo(() => parseBlockConfig(configDraft), [configDraft]);
  const baseConfig = useMemo(
    () => applyTextBindings(rawConfig, textBindings, "draft"),
    [rawConfig, textBindings]
  );
  const [draft, setDraft] = useState<CmsBlockConfig>(baseConfig);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firma para detectar cambios y para resetear al publicar/descartar.
  const baseSignature = useMemo(
    () => JSON.stringify(sanitizeBlockConfig(baseConfig as Record<string, unknown>)),
    [baseConfig]
  );
  const [savedSignature, setSavedSignature] = useState(baseSignature);

  // Sync desde props al cargar y tras publicar/descartar/revert.
  useEffect(() => {
    setDraft(baseConfig);
    setSavedSignature(baseSignature);
    setSaving(false);
    setSavedTick(false);
    setError(null);
  }, [baseConfig, baseSignature]);

  // Discard global del CMS: reseteo al publicado actual.
  useEffect(() => {
    const reset = () => {
      const publishedConfig = applyTextBindings(rawConfig, textBindings, "published");
      const signature = JSON.stringify(
        sanitizeBlockConfig(publishedConfig as Record<string, unknown>)
      );
      setDraft(publishedConfig);
      setSavedSignature(signature);
      setSaving(false);
      setSavedTick(false);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", reset);
    window.addEventListener("cms:drafts-discarded", reset);
    return () => {
      window.removeEventListener("cms:drafts-discarding", reset);
      window.removeEventListener("cms:drafts-discarded", reset);
    };
  }, [rawConfig, textBindings]);

  const dirty =
    JSON.stringify(sanitizeBlockConfig(draft as Record<string, unknown>)) !==
    savedSignature;

  if (!spec) return null;

  function set(name: keyof CmsBlockConfig, value: string) {
    setDraft((d) => ({ ...d, [name]: value }));
  }

  function setItemTitle(index: number, title: string) {
    setDraft((d) => {
      const items = [...(d.items ?? [])];
      while (items.length <= index) items.push({ title: "" });
      items[index] = { ...items[index], title };
      return { ...d, items };
    });
  }

  function updateSectionDesign(next: CmsSectionDesign) {
    const safe = sanitizeSectionDesign(next);
    setDraft((d) => ({
      ...d,
      design: Object.keys(safe).length > 0 ? safe : undefined,
    }));
  }

  function updateButtonDesign(key: string, next: CmsButtonDesign) {
    const safe = sanitizeButtonDesign(next);
    setDraft((d) => {
      const buttons = { ...(d.buttons ?? {}) };
      if (Object.keys(safe).length > 0) buttons[key] = safe;
      else delete buttons[key];
      return {
        ...d,
        buttons: Object.keys(buttons).length > 0 ? buttons : undefined,
      };
    });
  }

  function bindingKeyForField(name: keyof CmsBlockConfig): string | null {
    const binding = textBindings.find(
      (candidate) => candidate.kind === "field" && candidate.field === name
    );
    return binding?.key ?? null;
  }

  function bindingKeyForItem(index: number): string | null {
    const binding = textBindings.find(
      (candidate) => candidate.kind === "itemTitle" && candidate.index === index
    );
    return binding?.key ?? null;
  }

  async function uploadImage(name: keyof CmsBlockConfig, file: File) {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "No se pudo subir la imagen.");
        return;
      }
      set(name, data.url);
    } finally {
      setSaving(false);
    }
  }

  // Guardado unificado de la sección. Los textos SiteText-backed se guardan en
  // /api/admin/cms/text; el config se guarda solo para campos no textuales.
  async function saveSection() {
    if (saving || !dirty) return;
    const safe = sanitizeBlockConfig(draft as Record<string, unknown>);
    const signature = JSON.stringify(safe);
    const configOnly = stripBoundTextFromConfig(safe, textBindings);
    const configChanged =
      JSON.stringify(configOnly) !==
      JSON.stringify(stripBoundTextFromConfig(rawConfig, textBindings));
    setSaving(true);
    setError(null);
    try {
      for (const binding of textBindings) {
        const value = textBindingValue(safe, binding);
        if (value === binding.draft) continue;
        const r = await postCmsDraft("/api/admin/cms/text", {
          key: binding.key,
          value,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
      }
      if (configChanged) {
        const r = await postCmsDraft("/api/admin/cms/sections/config", {
          key: sectionKey,
          config: configOnly,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
      }
      setSavedSignature(signature);
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 1500);
      notifyCmsDraftChanged();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">{spec.intro}</p>

      {/* Contenido */}
      {(spec.fields.some((f) => f.kind === "text") || spec.itemTitles) && (
      <div className="space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
          Contenido
        </p>
        {spec.fields
          .filter((f) => f.kind === "text")
          .map((f) => (
            <Labeled key={String(f.name)} label={f.label}>
              <input
                value={(draft[f.name] as string | undefined) ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                autoFocus={bindingKeyForField(f.name) === selectedTextKey}
                className={inputClass}
              />
            </Labeled>
          ))}
        {spec.itemTitles
          ? Array.from({ length: spec.itemTitles }).map((_, i) => (
              <Labeled key={`item-${i}`} label={`Tarjeta ${i + 1}`}>
                <input
                  value={draft.items?.[i]?.title ?? ""}
                  onChange={(e) => setItemTitle(i, e.target.value)}
                  autoFocus={bindingKeyForItem(i) === selectedTextKey}
                  className={inputClass}
                />
              </Labeled>
            ))
          : null}
      </div>
      )}

      {/* Imagen */}
      {spec.fields.some((f) => f.kind === "image") && (
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Imagen
          </p>
          {spec.fields
            .filter((f) => f.kind === "image")
            .map((f) => {
              const url = (draft[f.name] as string | undefined) ?? "";
              return (
                <div key={String(f.name)} className="space-y-2">
                  <Labeled label={f.label}>
                    <input
                      value={url}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={inputClass}
                      placeholder="/images/..."
                    />
                  </Labeled>
                  <div className="flex items-center gap-3">
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="h-14 w-20 rounded border border-line object-cover"
                      />
                    )}
                    <label className="cursor-pointer rounded bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(f.name, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
          Diseño de la sección
        </summary>
        <SectionDesignControls
          sectionKey={sectionKey}
          target={designTarget}
          value={draft.design ?? {}}
          onChange={updateSectionDesign}
        />
      </details>

      {SECTION_BUTTONS[sectionKey]?.length > 0 && (
        <details
          open={
            !!selectedButton &&
            SECTION_BUTTONS[sectionKey].some((button) => button.key === selectedButton)
          }
          className="rounded-lg border border-line bg-white p-3"
        >
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
            Diseño del botón
          </summary>
          <div className="mt-3 space-y-4">
            {SECTION_BUTTONS[sectionKey].map((button) => (
              <ButtonDesignControls
                key={button.key}
                buttonKey={button.key}
                label={button.label}
                active={selectedButton === button.key}
                target={designTarget}
                value={draft.buttons?.[button.key] ?? {}}
                onChange={(next) => updateButtonDesign(button.key, next)}
              />
            ))}
          </div>
        </details>
      )}

      {/* Diseño avanzado (colapsado) — los ajustes finos de tipografía/tamaños
          siguen en Modo avanzado para no saturar el panel. */}
      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
          Diseño avanzado
        </summary>
        <p className="mt-2 text-xs leading-5 text-muted">
          Tipografías, tamaños, interlineado y espaciado fino de esta sección se
          ajustan desde{" "}
          <Link
            href="/admin/editor/home"
            className="font-bold text-ink underline"
          >
            Modo avanzado
          </Link>
          .
        </p>
      </details>

      {/* Guardar sección (un solo botón) */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveSection}
          disabled={saving || !dirty}
          className="rounded-full bg-ink px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar sección"}
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
    </div>
  );
}

const FONT_OPTIONS = CMS_FONT_OPTIONS;
const ALIGN_OPTIONS = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];
const WIDTH_OPTIONS = [
  { value: "auto", label: "Automático" },
  { value: "full", label: "Ancho completo" },
];
const UPPERCASE_OPTIONS = [
  { value: "on", label: "Sí" },
  { value: "off", label: "No" },
];
const SHADOW_OPTIONS = [
  { value: "none", label: "Sin sombra" },
  { value: "soft", label: "Suave" },
];

function keepOnlySectionMobile(value: CmsSectionDesign): CmsSectionDesign {
  return value.mobile ? { mobile: value.mobile } : {};
}

function keepOnlyButtonMobile(value: CmsButtonDesign): CmsButtonDesign {
  return value.mobile ? { mobile: value.mobile } : {};
}

function SectionDesignControls({
  sectionKey,
  target,
  value,
  onChange,
}: {
  sectionKey: string;
  target: CmsDesignTarget;
  value: CmsSectionDesign;
  onChange: (value: CmsSectionDesign) => void;
}) {
  const effective = effectiveSectionDesign(sectionKey, value, target);
  const setValue = (key: keyof CmsSectionDesignValues, next: string) =>
    onChange(setSectionDesignValue(value, target, key, next));
  const inherited =
    target === "mobile" && Object.keys(value.mobile ?? {}).length === 0;
  return (
    <div className="mt-3 space-y-3">
      <p className="rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
        Estás editando estilos para{" "}
        <span className="font-bold text-ink">
          {target === "mobile" ? "celular" : "computadora"}
        </span>
        . {target === "mobile"
          ? inherited
            ? "Ahora hereda el diseño de computadora."
            : "Tiene valores propios para celular."
          : "Estos valores se usan como base general."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorControl
          label="Fondo"
          value={effective.backgroundColor}
          onChange={(backgroundColor) => setValue("backgroundColor", backgroundColor)}
        />
        <ColorControl
          label="Texto"
          value={effective.textColor}
          onChange={(textColor) => setValue("textColor", textColor)}
        />
        <ColorControl
          label="Color del título"
          value={effective.titleColor}
          onChange={(titleColor) => setValue("titleColor", titleColor)}
        />
        <ColorControl
          label="Color del subtítulo"
          value={effective.subtitleColor}
          onChange={(subtitleColor) => setValue("subtitleColor", subtitleColor)}
        />
        <SelectControl
          label="Fuente del título"
          value={effective.titleFont}
          options={FONT_OPTIONS.map((font) => ({
            value: font,
            label: font,
          }))}
          onChange={(titleFont) => setValue("titleFont", titleFont)}
        />
        <PxControl
          label="Tamaño del título"
          value={effective.titleSize}
          onChange={(titleSize) => setValue("titleSize", titleSize)}
        />
        <SelectControl
          label="Fuente del texto"
          value={effective.textFont}
          options={FONT_OPTIONS.map((font) => ({
            value: font,
            label: font,
          }))}
          onChange={(textFont) => setValue("textFont", textFont)}
        />
        <PxControl
          label="Tamaño del texto"
          value={effective.textSize}
          onChange={(textSize) => setValue("textSize", textSize)}
        />
        <PxControl
          label="Espacio arriba"
          value={effective.paddingTop}
          onChange={(paddingTop) => setValue("paddingTop", paddingTop)}
        />
        <PxControl
          label="Espacio abajo"
          value={effective.paddingBottom}
          onChange={(paddingBottom) => setValue("paddingBottom", paddingBottom)}
        />
        <SelectControl
          label="Alineación"
          value={effective.align}
          options={ALIGN_OPTIONS}
          onChange={(align) => setValue("align", align)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {target === "mobile" && (
          <button
            type="button"
            onClick={() => onChange(resetSectionMobileDesign(value))}
            className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
          >
            Restablecer diseño móvil de esta sección
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onChange(target === "mobile" ? keepOnlySectionMobile(value) : {})
          }
          className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          Restablecer diseño de computadora
        </button>
      </div>
    </div>
  );
}

function ButtonDesignControls({
  buttonKey,
  label,
  active,
  target,
  value,
  onChange,
}: {
  buttonKey: string;
  label: string;
  active: boolean;
  target: CmsDesignTarget;
  value: CmsButtonDesign;
  onChange: (value: CmsButtonDesign) => void;
}) {
  const effective = effectiveButtonDesign(buttonKey, value, target);
  const setValue = (key: keyof CmsButtonDesignValues, next: string) =>
    onChange(setButtonDesignValue(value, target, key, next));
  const inherited =
    target === "mobile" && Object.keys(value.mobile ?? {}).length === 0;
  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-ink bg-cream/50" : "border-line bg-white"
      }`}
    >
      <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-ink">
        {label}
      </p>
      <p className="mb-3 rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
        Editando para{" "}
        <span className="font-bold text-ink">
          {target === "mobile" ? "celular" : "computadora"}
        </span>
        . {target === "mobile"
          ? inherited
            ? "Ahora hereda computadora."
            : "Tiene override móvil."
          : "Base general del botón."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorControl
          label="Fondo"
          value={effective.backgroundColor}
          onChange={(backgroundColor) => setValue("backgroundColor", backgroundColor)}
        />
        <ColorControl
          label="Texto"
          value={effective.textColor}
          onChange={(textColor) => setValue("textColor", textColor)}
        />
        <ColorControl
          label="Borde"
          value={effective.borderColor}
          onChange={(borderColor) => setValue("borderColor", borderColor)}
        />
        <PxControl
          label="Grosor borde"
          value={effective.borderWidth}
          max={8}
          onChange={(borderWidth) => setValue("borderWidth", borderWidth)}
        />
        <PxControl
          label="Radio"
          value={effective.borderRadius}
          max={80}
          onChange={(borderRadius) => setValue("borderRadius", borderRadius)}
        />
        <SelectControl
          label="Fuente"
          value={effective.fontFamily}
          options={FONT_OPTIONS.map((font) => ({
            value: font,
            label: font,
          }))}
          onChange={(fontFamily) => setValue("fontFamily", fontFamily)}
        />
        <PxControl
          label="Tamaño texto"
          value={effective.fontSize}
          onChange={(fontSize) => setValue("fontSize", fontSize)}
        />
        <PxControl
          label="Relleno horizontal"
          value={effective.paddingX}
          max={80}
          onChange={(paddingX) => setValue("paddingX", paddingX)}
        />
        <PxControl
          label="Relleno vertical"
          value={effective.paddingY}
          max={60}
          onChange={(paddingY) => setValue("paddingY", paddingY)}
        />
        <SelectControl
          label="Ancho"
          value={effective.width}
          options={WIDTH_OPTIONS}
          onChange={(width) => setValue("width", width)}
        />
        <SelectControl
          label="Mayúsculas"
          value={effective.uppercase}
          options={UPPERCASE_OPTIONS}
          onChange={(uppercase) => setValue("uppercase", uppercase)}
        />
        <SelectControl
          label="Sombra"
          value={effective.shadow}
          options={SHADOW_OPTIONS}
          onChange={(shadow) => setValue("shadow", shadow)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {target === "mobile" && (
          <button
            type="button"
            onClick={() => onChange(resetButtonMobileDesign(value))}
            className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
          >
            Restablecer diseño móvil del botón
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onChange(target === "mobile" ? keepOnlyButtonMobile(value) : {})
          }
          className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          Restablecer diseño de computadora
        </button>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#0a0a0a"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 rounded border border-line bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0A0A0A"
          className={inputClass}
        />
      </div>
    </label>
  );
}

function PxControl({
  label,
  value,
  max = 160,
  onChange,
}: {
  label: string;
  value: string;
  max?: number;
  onChange: (value: string) => void;
}) {
  const numeric = value.endsWith("px") ? Number(value.replace("px", "")) : 0;
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          value={Number.isFinite(numeric) ? numeric : 0}
          onChange={(e) => onChange(`${e.target.value}px`)}
          className="min-w-0 flex-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="16px"
          className="w-20 rounded border border-line bg-white px-2 py-2 text-sm text-ink outline-none focus:border-black"
        />
      </div>
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function applyTextBindings(
  config: CmsBlockConfig,
  bindings: HomeBlockTextBinding[],
  source: "draft" | "published"
): CmsBlockConfig {
  const next: CmsBlockConfig = { ...config };
  const items = config.items ? [...config.items] : undefined;
  for (const binding of bindings) {
    const value = source === "draft" ? binding.draft : binding.published;
    if (binding.kind === "field") {
      next[binding.field] = value;
      continue;
    }
    const rows = items ? [...items] : [];
    while (rows.length <= binding.index) rows.push({ title: "" });
    rows[binding.index] = { ...rows[binding.index], title: value };
    next.items = rows;
  }
  return next;
}

function textBindingValue(
  config: CmsBlockConfig,
  binding: HomeBlockTextBinding
): string {
  if (binding.kind === "field") {
    const value = config[binding.field];
    return typeof value === "string" ? value : "";
  }
  return config.items?.[binding.index]?.title ?? "";
}

function stripBoundTextFromConfig(
  config: CmsBlockConfig,
  bindings: HomeBlockTextBinding[]
): CmsBlockConfig {
  const next: CmsBlockConfig = { ...config };
  for (const binding of bindings) {
    if (binding.kind === "field") {
      delete next[binding.field];
      continue;
    }
    if (next.items) {
      const rows = next.items.map((item, index) =>
        index === binding.index ? { ...item, title: "" } : item
      );
      if (rows.every((item) => !item.title && !item.body)) delete next.items;
      else next.items = rows;
    }
  }
  return sanitizeBlockConfig(next as Record<string, unknown>);
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
