"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parseBlockConfig,
  sanitizeBlockConfig,
  type CmsBlockConfig,
} from "@/lib/cms-blocks";
import { postCmsDraft, notifyCmsDraftChanged } from "@/lib/cms-client";

// Panel limpio y owner-friendly para editar una sección-bloque del Home dentro
// del editor visual. Edita el MISMO objeto de configuración del bloque y guarda
// con UNA sola llamada a la API existente (/api/admin/cms/sections/config). No
// crea datos nuevos ni un sistema de guardado nuevo: el CMS clásico sigue igual.

type FieldKind = "text" | "image";
type Field = { name: keyof CmsBlockConfig; label: string; kind: FieldKind };

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
};

export default function HomeBlockPanel({
  sectionKey,
  configDraft,
}: {
  sectionKey: string;
  configDraft: string;
}) {
  const spec = SECTION_FIELDS[sectionKey];
  // Config base completa (no perder textStyles/imageAlt/etc al guardar).
  const baseConfig = useMemo(() => parseBlockConfig(configDraft), [configDraft]);
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
      setDraft(baseConfig);
      setSavedSignature(baseSignature);
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
  }, [baseConfig, baseSignature]);

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

  // Guardado unificado de la sección: UNA llamada a la API del bloque.
  async function saveSection() {
    if (saving || !dirty) return;
    const safe = sanitizeBlockConfig(draft as Record<string, unknown>);
    const signature = JSON.stringify(safe);
    setSaving(true);
    setError(null);
    try {
      const r = await postCmsDraft("/api/admin/cms/sections/config", {
        key: sectionKey,
        config: safe,
      });
      if (r.ok) {
        setSavedSignature(signature);
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1500);
        notifyCmsDraftChanged();
      } else {
        setError(r.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">{spec.intro}</p>

      {/* Contenido */}
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
                  className={inputClass}
                />
              </Labeled>
            ))
          : null}
      </div>

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
