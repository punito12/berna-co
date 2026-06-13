"use client";

import { useEffect, useRef, useState } from "react";

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

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
  const saveRunRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const changed = url !== published;

  useEffect(() => {
    setUrl(draft);
    setSavedUrl(draft);
  }, [draft]);

  useEffect(() => {
    const resetToPublished = () => {
      saveRunRef.current += 1;
      saveAbortRef.current?.abort();
      saveAbortRef.current = null;
      setUrl(published);
      setSavedUrl(published);
      setSaving(false);
      setSavedTick(false);
    };
    window.addEventListener("cms:drafts-discarding", resetToPublished);
    window.addEventListener("cms:drafts-discarded", resetToPublished);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToPublished);
      window.removeEventListener("cms:drafts-discarded", resetToPublished);
    };
  }, [published]);

  useEffect(() => {
    if (url === savedUrl) return;
    const timer = window.setTimeout(() => {
      void save(url);
    }, 700);
    return () => window.clearTimeout(timer);
    // save intentionally stays outside the dependency list because it receives
    // the explicit URL to persist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, savedUrl]);

  async function save(nextUrl = url) {
    if (nextUrl === savedUrl) return;
    const run = ++saveRunRef.current;
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: imageKey, url: nextUrl }),
        signal: controller.signal,
      });
      if (run !== saveRunRef.current) return;
      if (res.ok) {
        setSavedUrl(nextUrl);
        notifyDraftChanged();
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[cms image autosave]", error);
      }
    } finally {
      if (run === saveRunRef.current) setSaving(false);
    }
  }

  async function upload(file: File) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || "No se pudo subir la imagen.");
        return;
      }
      setUrl(data.url);
      await save(data.url);
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    setUrl(published);
    await save(published);
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          {label}
          {changed && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-500"
              title="Cambio sin publicar"
            />
          )}
        </span>
        {saving && <span className="text-[10px] text-muted">Guardando...</span>}
        {savedTick && (
          <span className="text-[10px] font-bold text-green-700">Guardado</span>
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
            onBlur={() => save()}
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
              onClick={restore}
              disabled={saving || !changed}
              className="font-bold uppercase tracking-widest text-[10px] text-muted hover:text-ink disabled:opacity-40"
            >
              Restaurar publicado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
