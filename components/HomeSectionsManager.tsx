"use client";

import { useEffect, useMemo, useState } from "react";
import CmsTextField from "@/components/CmsTextField";
import {
  CMS_BLOCK_LABELS,
  CMS_BLOCK_TYPES,
  defaultBlockConfig,
  normalizeBlockType,
  parseBlockConfig,
  sanitizeBlockConfig,
  type CmsBlockConfig,
  type CmsBlockType,
} from "@/lib/cms-blocks";
import {
  sanitizeTextStyle,
  type CmsTextStyle,
} from "@/lib/cms-text-styles";
import { humanizeCmsKey } from "@/lib/cms-labels";
import CmsStylePreview from "@/components/CmsStylePreview";
import { CMS_FONT_OPTIONS } from "@/lib/cms-fonts";
import { postCmsDraft, type CmsSaveResult } from "@/lib/cms-client";

const FONT_OPTIONS = ["", ...CMS_FONT_OPTIONS];

const WEIGHT_OPTIONS = ["", "300", "400", "500", "600", "700", "800", "900"];

const BLOCK_STYLE_LABELS: Record<string, string> = {
  eyebrow: "Bajada",
  title: "Título",
  subtitle: "Subtítulo",
  body: "Texto",
  ctaLabel: "Botón",
};

const OWNER_BLOCK_LABELS: Record<CmsBlockType, string> = {
  hero: "Portada principal",
  rich_text: "Texto libre",
  products_grid: "Productos",
  features: "Beneficios",
  image_text: "Imagen + texto",
  faq: "Preguntas frecuentes",
  cta: "Llamado a la acción",
  newsletter: "Newsletter",
  map: "Mapa",
  footer: "Pie de página",
};

const OWNER_BLOCK_DESCRIPTIONS: Record<CmsBlockType, string> = {
  hero: "Primera impresión del sitio: título, subtítulo, imagen y botón.",
  rich_text: "Una sección simple para contar algo de la marca.",
  products_grid: "La grilla donde el cliente ve y elige productos.",
  features: "Columnas cortas para destacar ingredientes o beneficios.",
  image_text: "Contenido con una imagen grande y texto de apoyo.",
  faq: "Preguntas frecuentes con respuestas desplegables.",
  cta: "Un bloque corto para invitar a una acción concreta.",
  newsletter: "Suscripción para recibir novedades.",
  map: "Mapa o puntos de venta visibles en el inicio.",
  footer: "Cierre del sitio con contacto y links.",
};

const SECTION_NAMES: Record<string, string> = {
  "home.hero": "Portada principal",
  "home.products": "Productos",
  "home.ingredients": "Ingredientes",
  "home.about": "Nuestra historia",
  "home.pos": "Puntos de venta",
  "home.footer": "Pie de página",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  "home.hero": "Lo primero que ve el cliente al entrar.",
  "home.products": "La sección donde aparecen los productos disponibles.",
  "home.ingredients": "Cards de ingredientes que llevan a sus páginas.",
  "home.about": "Historia o presentación de la marca.",
  "home.pos": "Mapa o información de puntos de venta.",
  "home.footer": "Cierre global del sitio.",
};

type Section = {
  key: string;
  type: string;
  visibleDraft: boolean;
  orderDraft: number;
  configDraft: string;
};
type TextRow = {
  key: string;
  value: string;
  valueDraft: string;
  style: string;
  styleDraft: string;
  maxLength: number;
};

const LEGACY_TEXT_KEYS: Record<string, string[]> = {
  "home.hero": ["home.hero.title", "home.hero.subtitle", "home.hero.cta"],
  "home.ingredients": [
    "home.ingredients.eyebrow",
    "home.ingredients.title",
    "home.ingredients.item1",
    "home.ingredients.item2",
    "home.ingredients.item3",
  ],
  "home.products": ["catalogo.eyebrow", "catalogo.title", "catalogo.subtitle"],
  "home.about": ["home.about.title", "home.about.paragraph"],
  "home.pos": ["home.pos.eyebrow", "home.pos.title", "home.pos.subtitle"],
};

export function legacyKeysForSection(key: string, config: CmsBlockConfig): string[] {
  // If the block config already has its own content fields, the legacy SiteText
  // keys are no longer read by the storefront — hide them to avoid duplication.
  const hasBlockContent = !!(config.title || config.body || config.eyebrow ||
    config.subtitle || config.ctaLabel || (config.items && config.items.length > 0));
  if (hasBlockContent) return [];
  return LEGACY_TEXT_KEYS[key] ?? [];
}

function sectionDisplayName(
  sectionKey: string,
  type: CmsBlockType,
  config: CmsBlockConfig
): string {
  return config.title || SECTION_NAMES[sectionKey] || OWNER_BLOCK_LABELS[type];
}

function sectionDescription(sectionKey: string, type: CmsBlockType): string {
  return SECTION_DESCRIPTIONS[sectionKey] || OWNER_BLOCK_DESCRIPTIONS[type];
}

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

export default function HomeSectionsManager({
  initialSections,
  texts,
}: {
  initialSections: Section[];
  texts: TextRow[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newType, setNewType] = useState<CmsBlockType>("rich_text");
  const [busy, setBusy] = useState<string | null>(null);
  const textByKey = useMemo(() => new Map(texts.map((t) => [t.key, t])), [texts]);

  // Re-sync structural state from props after publish/discard/revert (those call
  // router.refresh, re-running the server page with fresh sections). During
  // normal editing initialSections doesn't change, so local reordering/edits are
  // preserved. This makes "Descartar cambios" visually reset the home sections.
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  // Notifies the status bar to re-check pending changes. We DON'T call
  // router.refresh() here: every action already updates local state
  // (setSections), and refreshing re-renders the whole server page on each
  // keystroke/toggle, which made the editor flicker. The published values only
  // change on publish, so a local update is enough.
  function refreshAfterDraft() {
    notifyDraftChanged();
  }

  async function persistOrder(next: Section[]) {
    setSections(next);
    await fetch("/api/admin/cms/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "home", keys: next.map((s) => s.key) }),
    });
    refreshAfterDraft();
  }

  function onDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = sections.findIndex((s) => s.key === dragKey);
    const to = sections.findIndex((s) => s.key === targetKey);
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragKey(null);
    persistOrder(next);
  }

  async function toggleVisible(key: string, visible: boolean) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visibleDraft: visible } : s))
    );
    await fetch("/api/admin/cms/sections/visible", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, visible }),
    });
    refreshAfterDraft();
  }

  async function createSection() {
    setBusy("create");
    try {
      const res = await fetch("/api/admin/cms/sections/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "home", type: newType }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo crear.");
      const section = data.section as Section;
      setSections((prev) => [...prev, section]);
      setEditing(section.key);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  async function duplicateSection(key: string) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/cms/sections/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo duplicar.");
      const section = data.section as Section;
      setSections((prev) => [...prev, section]);
      setEditing(section.key);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  async function deleteSection(key: string) {
    const ok = window.confirm("Vas a borrar esta sección del sitio.");
    if (!ok) return;
    setBusy(key);
    try {
      const res = await fetch("/api/admin/cms/sections/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo borrar.");
      setSections((prev) => prev.filter((s) => s.key !== key));
      if (editing === key) setEditing(null);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  // Saves a block's config to the draft. Timeout-protected; returns a result so
  // the editor can show a clear error instead of an infinite spinner.
  async function saveConfig(
    key: string,
    config: CmsBlockConfig
  ): Promise<CmsSaveResult> {
    const safe = sanitizeBlockConfig(config as Record<string, unknown>);
    const r = await postCmsDraft("/api/admin/cms/sections/config", {
      key,
      config: safe,
    });
    if (r.ok) {
      setSections((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, configDraft: JSON.stringify(safe) } : s
        )
      );
      refreshAfterDraft();
    }
    return r;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-widest text-[11px] text-muted">
              Agregar al inicio
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              Sumá una sección nueva como borrador. No se ve en el sitio hasta
              publicar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CmsBlockType)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink"
            >
              {CMS_BLOCK_TYPES.filter((type) => type !== "footer").map((type) => (
                <option key={type} value={type}>
                  {OWNER_BLOCK_LABELS[type]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createSection}
              disabled={busy !== null}
              className="rounded-full bg-ink px-5 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {busy === "create" ? "Creando..." : "Crear sección"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-cream/45 px-4 py-3 text-sm leading-6 text-muted">
        <span className="font-bold text-ink">Cómo ordenar:</span> arrastrá las
        secciones con el ícono de puntos. Los cambios quedan privados hasta
        publicar.
      </div>

      {sections.map((section, index) => {
        const type = normalizeBlockType(section.type, section.key);
        const open = editing === section.key;
        const config = parseBlockConfig(section.configDraft);
        const legacyKeys = legacyKeysForSection(section.key, config);
        const displayName = sectionDisplayName(section.key, type, config);
        const description = sectionDescription(section.key, type);
        return (
          <article
            key={section.key}
            draggable
            onDragStart={() => setDragKey(section.key)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(section.key)}
            className={`rounded-2xl border bg-white shadow-sm transition-colors ${
              dragKey === section.key ? "border-black opacity-60" : "border-line"
            } ${!section.visibleDraft ? "opacity-70" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="cursor-grab select-none rounded-full border border-line bg-cream px-2 py-1 text-muted"
                  title="Arrastrar"
                >
                  ⠿
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                    Sección {index + 1} · {OWNER_BLOCK_LABELS[type]}
                  </p>
                  <p className="mt-1 truncate font-black uppercase tracking-tight text-lg leading-none text-ink">
                    {displayName}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {description}
                  </p>
                </div>
                {!section.visibleDraft && (
                  <span className="rounded-full bg-cream px-3 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
                    Oculta
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleVisible(section.key, !section.visibleDraft)}
                  className="rounded-full border border-line bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted hover:border-ink hover:text-ink"
                >
                  {section.visibleDraft ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(open ? null : section.key)}
                  className="rounded-full bg-ink px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white"
                >
                  {open ? "Cerrar" : "Editar"}
                </button>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-full border border-line bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted hover:border-ink hover:text-ink">
                    Más
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-line bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => duplicateSection(section.key)}
                      disabled={busy !== null}
                      className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest text-ink hover:bg-cream disabled:opacity-40"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSection(section.key)}
                      disabled={busy !== null || section.key === "home.footer"}
                      className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest text-muted hover:bg-cream hover:text-ink disabled:opacity-40"
                    >
                      Borrar
                    </button>
                  </div>
                </details>
              </div>
            </div>
            {open && (
              <div className="space-y-4 border-t border-line bg-cream/25 p-4 sm:p-5">
                {legacyKeys.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-bold uppercase tracking-widest text-[11px] text-muted">
                      Textos principales
                    </p>
                    {legacyKeys.map((tk) => {
                      const t = textByKey.get(tk);
                      if (!t) return null;
                      return (
                        <CmsTextField
                          key={tk}
                          textKey={tk}
                          label={humanizeCmsKey(tk)}
                          published={t.value}
                          draft={t.valueDraft}
                          style={t.style}
                          styleDraft={t.styleDraft}
                          maxLength={t.maxLength}
                          multiline={t.maxLength > 80}
                        />
                      );
                    })}
                  </div>
                )}
                {type !== "footer" && (
                  <BlockConfigEditor
                    type={type}
                    config={config}
                    onSave={(next) => saveConfig(section.key, next)}
                  />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function BlockConfigEditor({
  type,
  config,
  onSave,
}: {
  type: CmsBlockType;
  config: CmsBlockConfig;
  onSave: (config: CmsBlockConfig) => Promise<CmsSaveResult>;
}) {
  const initialDraft = useMemo(
    () => ({
      ...defaultBlockConfig(type),
      ...config,
    }),
    [type, config]
  );
  const [draft, setDraft] = useState<CmsBlockConfig>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState(() =>
    JSON.stringify(sanitizeBlockConfig(initialDraft as Record<string, unknown>))
  );

  const dirty =
    JSON.stringify(sanitizeBlockConfig(draft as Record<string, unknown>)) !==
    savedSignature;

  // Sync from props on load and after publish/discard/revert.
  useEffect(() => {
    const next = {
      ...defaultBlockConfig(type),
      ...config,
    };
    setDraft(next);
    setSavedSignature(
      JSON.stringify(sanitizeBlockConfig(next as Record<string, unknown>))
    );
    setSaving(false);
    setSavedTick(false);
    setError(null);
  }, [type, config]);

  // Discard: reset to the current (published) config.
  useEffect(() => {
    const resetToCurrentConfig = () => {
      const next = {
        ...defaultBlockConfig(type),
        ...config,
      };
      setDraft(next);
      setSavedSignature(
        JSON.stringify(sanitizeBlockConfig(next as Record<string, unknown>))
      );
      setSaving(false);
      setSavedTick(false);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", resetToCurrentConfig);
    window.addEventListener("cms:drafts-discarded", resetToCurrentConfig);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToCurrentConfig);
      window.removeEventListener("cms:drafts-discarded", resetToCurrentConfig);
    };
  }, [type, config]);

  async function saveNow() {
    if (saving || !dirty) return;
    const safe = sanitizeBlockConfig(draft as Record<string, unknown>);
    const signature = JSON.stringify(safe);
    setSaving(true);
    setError(null);
    try {
      const r = await onSave(safe);
      if (r.ok) {
        setSavedSignature(signature);
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1500);
      } else {
        setError(r.error);
      }
    } finally {
      setSaving(false);
    }
  }

  function update(next: CmsBlockConfig) {
    setDraft(next);
  }

  function updateTextStyle(part: string, style: CmsTextStyle) {
    const safe = sanitizeTextStyle(style as Record<string, unknown>);
    const textStyles = { ...(draft.textStyles ?? {}) };
    if (Object.keys(safe).length > 0) textStyles[part] = safe;
    else delete textStyles[part];
    update({
      ...draft,
      textStyles: Object.keys(textStyles).length > 0 ? textStyles : undefined,
    });
  }

  async function uploadImage(file: File) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) return alert(data.error || "No se pudo subir.");
      update({ ...draft, imageUrl: data.url });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black uppercase tracking-widest text-[11px] text-muted">
            Contenido de la sección
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Editá estos campos y guardá el bloque como borrador. Se publica con
            “Publicar cambios” en la barra de arriba.
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
            dirty
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : savedTick
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-line bg-cream text-muted"
          }`}
        >
          {saving
            ? "Guardando…"
            : dirty
            ? "Sin guardar"
            : savedTick
            ? "Guardado"
            : "Guardado"}
        </div>
      </div>
      <div className="grid gap-3">
        {["hero", "products_grid", "features", "image_text", "map"].includes(type) && (
          <TextInput
            label="Bajada"
            value={draft.eyebrow ?? ""}
            onChange={(v) => update({ ...draft, eyebrow: v })}
          />
        )}
        {type !== "map" && (
          <TextInput
            label="Título"
            value={draft.title ?? ""}
            onChange={(v) => update({ ...draft, title: v })}
          />
        )}
        {["hero", "products_grid", "image_text", "cta", "newsletter", "map"].includes(type) && (
          <TextInput
            label="Subtítulo"
            value={draft.subtitle ?? ""}
            onChange={(v) => update({ ...draft, subtitle: v })}
          />
        )}
        {["rich_text", "image_text"].includes(type) && (
          <TextArea
            label="Texto"
            value={draft.body ?? ""}
            onChange={(v) => update({ ...draft, body: v })}
          />
        )}
        {["hero", "cta", "image_text"].includes(type) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Texto del botón"
              value={draft.ctaLabel ?? ""}
              onChange={(v) => update({ ...draft, ctaLabel: v })}
            />
            <TextInput
              label="Link del botón"
              value={draft.ctaHref ?? ""}
              onChange={(v) => update({ ...draft, ctaHref: v })}
            />
          </div>
        )}
        {["hero", "image_text"].includes(type) && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <TextInput
              label="Imagen"
              value={draft.imageUrl ?? ""}
              onChange={(v) => update({ ...draft, imageUrl: v })}
            />
            <label className="mt-5 cursor-pointer bg-black px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-white">
              Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </label>
          </div>
        )}
        {type === "map" && (
          <TextInput
            label="URL del mapa"
            value={draft.mapSrc ?? ""}
            onChange={(v) => update({ ...draft, mapSrc: v })}
          />
        )}
        {type === "features" && (
          <Repeater
            label="Items"
            rows={draft.items ?? []}
            empty={{ title: "Nuevo item", body: "" }}
            onChange={(items) => update({ ...draft, items })}
          />
        )}
        {type === "faq" && (
          <FaqRepeater
            rows={draft.faqs ?? []}
            onChange={(faqs) => update({ ...draft, faqs })}
          />
        )}
        <details className="rounded-xl border border-line bg-cream/35 p-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
            Opciones avanzadas de diseño
          </summary>
          <div className="mt-3 grid gap-4">
            {["eyebrow", "title", "subtitle", "body", "ctaLabel"].map((part) => (
              <BlockTextStyleControls
                key={part}
                label={BLOCK_STYLE_LABELS[part] ?? humanizeCmsKey(part)}
                sampleText={
                  (draft[part as keyof CmsBlockConfig] as string | undefined) ?? ""
                }
                value={draft.textStyles?.[part] ?? {}}
                onChange={(style) => updateTextStyle(part, style)}
              />
            ))}
          </div>
        </details>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveNow}
          disabled={saving || !dirty}
          className="rounded-full bg-ink px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {error && (
          <span className="text-[11px] font-bold text-red-700">{error}</span>
        )}
      </div>
    </div>
  );
}

function TextInput({
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
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
      />
    </label>
  );
}

function TextArea({
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
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
      />
    </label>
  );
}

function Repeater({
  label,
  rows,
  empty,
  onChange,
}: {
  label: string;
  rows: { title: string; body?: string }[];
  empty: { title: string; body?: string };
  onChange: (rows: { title: string; body?: string }[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-line bg-white p-3">
            <TextInput
              label="Título"
              value={row.title}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, title: v } : r)))
              }
            />
            <TextInput
              label="Texto"
              value={row.body ?? ""}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, body: v } : r)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="justify-self-start text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, empty])}
        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Agregar item
      </button>
    </div>
  );
}

function FaqRepeater({
  rows,
  onChange,
}: {
  rows: { question: string; answer: string }[];
  onChange: (rows: { question: string; answer: string }[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
        Preguntas
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-line bg-white p-3">
            <TextInput
              label="Pregunta"
              value={row.question}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, question: v } : r)))
              }
            />
            <TextArea
              label="Respuesta"
              value={row.answer}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, answer: v } : r)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="justify-self-start text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { question: "Pregunta", answer: "Respuesta" }])}
        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Agregar pregunta
      </button>
    </div>
  );
}

function BlockTextStyleControls({
  label,
  sampleText,
  value,
  onChange,
}: {
  label: string;
  sampleText: string;
  value: CmsTextStyle;
  onChange: (value: CmsTextStyle) => void;
}) {
  return (
    <div className="rounded border border-line bg-cream/30 p-3">
      <p className="mb-2 font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <SmallSelect
          label="Fuente"
          value={value.fontFamily ?? ""}
          options={FONT_OPTIONS}
          onChange={(fontFamily) =>
            onChange({ ...value, fontFamily: fontFamily || undefined })
          }
        />
        <SmallSelect
          label="Peso"
          value={value.fontWeight ?? ""}
          options={WEIGHT_OPTIONS}
          onChange={(fontWeight) =>
            onChange({ ...value, fontWeight: fontWeight || undefined })
          }
        />
        <SmallInput
          label="Tamaño desktop"
          value={value.fontSize ?? ""}
          placeholder="Ej: 48px"
          onBlur={(fontSize) =>
            onChange({ ...value, fontSize: fontSize || undefined })
          }
        />
        <SmallInput
          label="Tamaño mobile"
          value={value.fontSizeMobile ?? ""}
          placeholder="Ej: 32px"
          onBlur={(fontSizeMobile) =>
            onChange({ ...value, fontSizeMobile: fontSizeMobile || undefined })
          }
        />
        <SmallInput
          label="Interlineado"
          value={value.lineHeight ?? ""}
          placeholder="Ej: 1.1"
          onBlur={(lineHeight) =>
            onChange({ ...value, lineHeight: lineHeight || undefined })
          }
        />
        <SmallInput
          label="Espaciado"
          value={value.letterSpacing ?? ""}
          placeholder="Ej: 0.02em"
          onBlur={(letterSpacing) =>
            onChange({ ...value, letterSpacing: letterSpacing || undefined })
          }
        />
        <SmallToggle
          label="Itálica"
          checked={value.italic === true}
          onChange={(italic) => onChange({ ...value, italic: italic || undefined })}
        />
        <SmallToggle
          label="Mayúsculas"
          checked={value.uppercase === true}
          onChange={(uppercase) =>
            onChange({ ...value, uppercase: uppercase || undefined })
          }
        />
      </div>
      <CmsStylePreview text={sampleText} style={value} />
    </div>
  );
}

function SmallSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option || "default"} value={option}>
            {option || "Actual"}
          </option>
        ))}
      </select>
    </label>
  );
}

function SmallInput({
  label,
  value,
  placeholder,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder: string;
  onBlur: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const next = local.trim();
    if (next === value) return;
    const timer = window.setTimeout(() => onBlur(next), 700);
    return () => window.clearTimeout(timer);
  }, [local, onBlur, value]);
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlur(local.trim())}
        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
      />
    </label>
  );
}

function SmallToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-black"
      />
      {label}
    </label>
  );
}
