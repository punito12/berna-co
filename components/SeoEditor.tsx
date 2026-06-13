"use client";

import { useEffect, useRef, useState } from "react";
import CmsImageField from "@/components/CmsImageField";

const DOMAIN = "csberna.com.ar";

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

async function saveText(
  key: string,
  value: string,
  signal?: AbortSignal
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch("/api/admin/cms/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
      signal,
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.error("[cms seo autosave]", error);
    }
    return false;
  }
  if (res.ok) notifyDraftChanged();
  return res.ok;
}

type FieldProps = {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  maxLength: number;
  multiline?: boolean;
};

type SeoValues = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  homeTitle: string;
  homeDescription: string;
  confianzaTitle: string;
  confianzaDescription: string;
};

type SeoField = keyof SeoValues;

function Field({
  label,
  help,
  value,
  onChange,
  onBlur,
  maxLength,
  multiline,
}: FieldProps) {
  const cls =
    "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-muted">
          {value.length}/{maxLength}
        </span>
      </span>
      {multiline ? (
        <textarea
          value={value}
          maxLength={maxLength}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cls + " resize-y"}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cls}
        />
      )}
      {help && <span className="mt-1 block text-xs leading-5 text-muted">{help}</span>}
    </label>
  );
}

export default function SeoEditor({
  keys,
  initial,
  ogImage,
}: {
  keys: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    homeTitle: string;
    homeDescription: string;
    confianzaTitle: string;
    confianzaDescription: string;
  };
  initial: SeoValues;
  ogImage: { key: string; published: string; draft: string };
}) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const saveRunRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const set = (k: keyof typeof v, value: string) =>
    setV((prev) => ({ ...prev, [k]: value }));

  useEffect(() => {
    setV(initial);
    setSaved(initial);
    setSaving(false);
    setSavedTick(false);
  }, [initial]);

  useEffect(() => {
    const resetToInitial = () => {
      saveRunRef.current += 1;
      saveAbortRef.current?.abort();
      saveAbortRef.current = null;
      setV(initial);
      setSaved(initial);
      setSaving(false);
      setSavedTick(false);
    };
    window.addEventListener("cms:drafts-discarding", resetToInitial);
    window.addEventListener("cms:drafts-discarded", resetToInitial);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToInitial);
      window.removeEventListener("cms:drafts-discarded", resetToInitial);
    };
  }, [initial]);

  async function saveFields(fields: SeoField[]) {
    const pending = fields.filter((field) => v[field] !== saved[field]);
    if (!pending.length) return;
    const run = ++saveRunRef.current;
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    setSaving(true);
    const results = await Promise.all(
      pending.map((field) => saveText(keys[field], v[field], controller.signal))
    );
    if (run !== saveRunRef.current) return;
    if (results.every(Boolean)) {
      setSaved((prev) => {
        const next = { ...prev };
        for (const field of pending) next[field] = v[field];
        return next;
      });
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 1200);
    }
    setSaving(false);
  }

  useEffect(() => {
    const pending = (Object.keys(v) as SeoField[]).filter(
      (field) => v[field] !== saved[field]
    );
    if (!pending.length) return;
    const timer = window.setTimeout(() => {
      void saveFields(pending);
    }, 700);
    return () => window.clearTimeout(timer);
    // saveFields intentionally stays outside the dependency list because the
    // effect passes the explicit fields to persist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, saved]);

  // Social preview uses the OG fields, falling back to the main title/desc.
  const previewTitle = v.ogTitle.trim() || v.title.trim() || "Berna&co";
  const previewDesc =
    v.ogDescription.trim() || v.description.trim() || "";

  return (
    <div className="space-y-8">
      {/* Google */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-line pb-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Cómo te ve Google
            </p>
            <p className="rounded-full border border-line bg-cream px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              {saving ? "Guardando..." : savedTick ? "Guardado" : "Autosave activo"}
            </p>
          </div>
          <h3 className="font-black uppercase tracking-tight text-lg text-ink">
            Google
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            El título y la descripción que aparecen en los resultados de
            búsqueda de Google para la portada del sitio.
          </p>
        </div>
        <div className="grid gap-3">
          <Field
            label="Título del sitio"
            help="Ideal hasta ~60 caracteres."
            value={v.title}
            onChange={(x) => set("title", x)}
            onBlur={() => void saveFields(["title"])}
            maxLength={70}
          />
          <Field
            label="Descripción para Google"
            help="Ideal hasta ~155 caracteres."
            value={v.description}
            onChange={(x) => set("description", x)}
            onBlur={() => void saveFields(["description"])}
            maxLength={200}
            multiline
          />
        </div>
        {/* Google result preview */}
        <div className="mt-4 rounded-xl border border-line bg-cream/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Vista en Google
          </p>
          <div className="mt-2">
            <p className="text-xs text-green-800">{DOMAIN}</p>
            <p className="text-lg leading-snug text-blue-800">
              {v.title.trim() || "Título del sitio"}
            </p>
            <p className="text-sm leading-6 text-ink/70">
              {v.description.trim() || "Descripción para Google."}
            </p>
          </div>
        </div>
      </section>

      {/* Share */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-line pb-3">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Al compartir el link
          </p>
          <h3 className="font-black uppercase tracking-tight text-lg text-ink">
            Compartir por WhatsApp y redes
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Lo que se ve cuando alguien pega el link del sitio en WhatsApp,
            Instagram o Facebook. Si dejás el título y la descripción vacíos, se
            usan los de Google.
          </p>
        </div>
        <div className="grid gap-3">
          <Field
            label="Título al compartir (opcional)"
            value={v.ogTitle}
            onChange={(x) => set("ogTitle", x)}
            onBlur={() => void saveFields(["ogTitle"])}
            maxLength={70}
          />
          <Field
            label="Descripción al compartir (opcional)"
            value={v.ogDescription}
            onChange={(x) => set("ogDescription", x)}
            onBlur={() => void saveFields(["ogDescription"])}
            maxLength={200}
            multiline
          />
          <div>
            <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
              Imagen al compartir
            </p>
            <p className="mb-2 text-xs leading-5 text-muted">
              Se recomienda una imagen de 1200×630 px. Es la que aparece grande
              en la tarjeta al compartir el link.
            </p>
            <CmsImageField
              imageKey={ogImage.key}
              label="Imagen para compartir"
              published={ogImage.published}
              draft={ogImage.draft}
            />
          </div>
        </div>
        {/* Social card preview */}
        <div className="mt-4 rounded-xl border border-line bg-cream/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Vista al compartir
          </p>
          <div className="mt-2 max-w-md overflow-hidden rounded-xl border border-line bg-white">
            {ogImage.draft ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ogImage.draft}
                alt="Vista de la imagen al compartir"
                className="aspect-[1200/630] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/630] w-full items-center justify-center bg-cream text-xs text-muted">
                Sin imagen
              </div>
            )}
            <div className="border-t border-line p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">
                {DOMAIN}
              </p>
              <p className="mt-1 font-bold leading-snug text-ink">
                {previewTitle}
              </p>
              {previewDesc && (
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/70">
                  {previewDesc}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Per-page */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-line pb-3">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Por página
          </p>
          <h3 className="font-black uppercase tracking-tight text-lg text-ink">
            Páginas principales
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Título y descripción específicos para algunas páginas. Si los dejás
            vacíos, se usan los del sitio.
          </p>
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-cream/25 p-4">
            <p className="mb-3 font-black uppercase tracking-tight text-sm text-ink">
              Portada (inicio)
            </p>
            <div className="grid gap-3">
              <Field
                label="Título"
                value={v.homeTitle}
                onChange={(x) => set("homeTitle", x)}
                onBlur={() => void saveFields(["homeTitle"])}
                maxLength={70}
              />
              <Field
                label="Descripción"
                value={v.homeDescription}
                onChange={(x) => set("homeDescription", x)}
                onBlur={() => void saveFields(["homeDescription"])}
                maxLength={200}
                multiline
              />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-cream/25 p-4">
            <p className="mb-3 font-black uppercase tracking-tight text-sm text-ink">
              Cómo comprar (/confianza)
            </p>
            <div className="grid gap-3">
              <Field
                label="Título"
                value={v.confianzaTitle}
                onChange={(x) => set("confianzaTitle", x)}
                onBlur={() => void saveFields(["confianzaTitle"])}
                maxLength={70}
              />
              <Field
                label="Descripción"
                value={v.confianzaDescription}
                onChange={(x) => set("confianzaDescription", x)}
                onBlur={() => void saveFields(["confianzaDescription"])}
                maxLength={200}
                multiline
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
