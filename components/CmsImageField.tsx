"use client";

import { useEffect, useState } from "react";
import { postCmsDraft, notifyCmsDraftChanged } from "@/lib/cms-client";

export default function CmsImageField({
  imageKey,
  label,
  published,
  draft,
}: {
  imageKey: string;
  label: string;
  published: string;
  draft: string;
}) {
  const [url, setUrl] = useState(draft);
  const [savedUrl, setSavedUrl] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = url !== savedUrl;
  const changedFromPublished = savedUrl !== published;

  // Sync from props on load and after publish/discard/revert.
  useEffect(() => {
    setUrl(draft);
    setSavedUrl(draft);
  }, [draft]);

  // Discard: reset to published immediately.
  useEffect(() => {
    const resetToPublished = () => {
      setUrl(published);
      setSavedUrl(published);
      setSaving(false);
      setSavedTick(false);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", resetToPublished);
    window.addEventListener("cms:drafts-discarded", resetToPublished);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToPublished);
      window.removeEventListener("cms:drafts-discarded", resetToPublished);
    };
  }, [published]);

  function flashSaved() {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  // Persists a URL to the draft (timeout-protected). Used by the save button and
  // right after an upload completes.
  async function persist(nextUrl: string) {
    setSaving(true);
    setError(null);
    try {
      const r = await postCmsDraft("/api/admin/cms/image", {
        key: imageKey,
        url: nextUrl,
      });
      if (!r.ok) {
        setError(r.error);
        return false;
      }
      setSavedUrl(nextUrl);
      notifyCmsDraftChanged();
      flashSaved();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
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
        setSaving(false);
        return;
      }
      setUrl(data.url);
      await persist(data.url);
    } catch {
      setError("Hubo un problema al subir la imagen. Intentá de nuevo.");
      setSaving(false);
    }
  }

  async function restore() {
    if (saving) return;
    setUrl(published);
    await persist(published);
  }

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        dirty ? "border-amber-400" : "border-line"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          {label}
          {changedFromPublished && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-500"
              title="Cambio guardado, falta publicar"
            />
          )}
        </span>
        {saving && <span className="text-[10px] text-muted">Guardando…</span>}
        {savedTick && !dirty && (
          <span className="text-[10px] font-bold text-green-700">✓ Guardado</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded border border-line bg-cream/50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">Sin imagen</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
            placeholder="/images/..."
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
              Subir imagen
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => void persist(url)}
              disabled={saving || !dirty}
              className="rounded bg-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={restore}
              disabled={saving || !changedFromPublished}
              className="font-bold uppercase tracking-widest text-[10px] text-muted hover:text-ink disabled:opacity-40"
            >
              Restaurar publicado
            </button>
          </div>
          {error && (
            <p className="text-[11px] font-bold text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
