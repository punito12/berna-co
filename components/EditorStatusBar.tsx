"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Pending = {
  total: number;
  texts: number;
  images: number;
  sections: number;
  theme: boolean;
  typography: boolean;
  logo: boolean;
} | null;

type Version = {
  id: string;
  publishedAt: string;
  publishedBy: string;
};

function pendingSummary(pending: Pending): string {
  if (!pending || pending.total === 0) return "No hay cambios para publicar.";
  const parts = [
    pending.texts > 0
      ? `${pending.texts} texto${pending.texts === 1 ? "" : "s"}`
      : "",
    pending.images > 0
      ? `${pending.images} imagen${pending.images === 1 ? "" : "es"}`
      : "",
    pending.sections > 0
      ? `${pending.sections} sección${pending.sections === 1 ? "" : "es"}`
      : "",
    pending.theme ? "colores" : "",
    pending.typography ? "tipografía" : "",
    pending.logo ? "logo" : "",
  ].filter(Boolean);
  return parts.join(", ");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Top status bar of the site editor: pending count + preview/publish/discard
// actions + version history.
export default function EditorStatusBar() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const [pendingRes, versionsRes] = await Promise.all([
        fetch("/api/admin/cms/pending", { cache: "no-store" }),
        fetch("/api/admin/cms/versions", { cache: "no-store" }),
      ]);
      const pendingData = await pendingRes.json();
      const versionsData = await versionsRes.json();
      setPending(pendingData.pending ?? null);
      setVersions(versionsData.versions ?? []);
    } catch {
      setPending(null);
      setVersions([]);
    }
  }

  useEffect(() => {
    refresh();
    // Refresh when the window regains focus (after editing on another tab).
    const onFocus = () => refresh();
    const onDraftChanged = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cms:draft-changed", onDraftChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cms:draft-changed", onDraftChanged);
    };
  }, []);

  const count = pending?.total ?? 0;
  const summary = pendingSummary(pending);

  async function openPreview() {
    setBusy("preview");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/preview-token", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setMessage(data.error || "No se pudo abrir el preview.");
        return;
      }
      window.open(`/?preview=${encodeURIComponent(data.token)}`, "_blank");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (count === 0) return;
    const ok = window.confirm(
      `Vas a publicar estos cambios:\n\n${summary}\n\nEl público los va a ver de inmediato.`
    );
    if (!ok) return;
    setBusy("publish");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo publicar.");
        return;
      }
      setMessage(data.version ? "Cambios publicados." : "No había cambios.");
      await refresh();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    if (count === 0) return;
    const ok = window.confirm(
      `Vas a descartar estos borradores:\n\n${summary}\n\nSe volverá al contenido publicado actual.`
    );
    if (!ok) return;
    setBusy("discard");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/discard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudieron descartar los cambios.");
        return;
      }
      setMessage("Borradores descartados.");
      await refresh();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function revert(version: Version) {
    const first = window.confirm(
      `Vas a restaurar la versión del ${formatDate(version.publishedAt)}.`
    );
    if (!first) return;
    const second = window.confirm(
      "Confirmación final: esto reemplaza el contenido publicado y los borradores actuales."
    );
    if (!second) return;
    setBusy(version.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo revertir.");
        return;
      }
      setMessage("Versión restaurada.");
      await refresh();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="sticky top-4 z-30 mb-6 rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span
            className={`text-sm font-bold ${
              count > 0 ? "text-amber-700" : "text-muted"
            }`}
          >
            {count > 0
              ? `Tenés ${count} cambio${count === 1 ? "" : "s"} sin publicar`
              : "Sin cambios pendientes"}
          </span>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-muted">
            Editás un borrador · el público ve lo publicado
          </p>
          {count > 0 && (
            <p className="mt-2 text-xs text-muted">Resumen: {summary}</p>
          )}
          {message && (
            <p className="mt-2 text-xs font-bold text-green-700">{message}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openPreview}
            disabled={busy !== null}
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-40"
          >
            {busy === "preview" ? "Abriendo..." : "Ver preview"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={busy !== null || count === 0}
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:border-black hover:text-ink disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy !== null || count === 0}
            className="rounded bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
          >
            {busy === "publish" ? "Publicando..." : "Publicar cambios"}
          </button>
        </div>
      </div>

      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
          Historial de versiones
        </summary>
        <div className="mt-3 space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay publicaciones.</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2"
              >
                <span className="text-sm text-ink">
                  {formatDate(version.publishedAt)}
                  <span className="ml-2 text-xs text-muted">
                    {version.publishedBy}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => revert(version)}
                  disabled={busy !== null}
                  className="text-[10px] font-bold uppercase tracking-widest text-ink hover:underline disabled:opacity-40"
                >
                  {busy === version.id ? "Restaurando..." : "Revertir"}
                </button>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
