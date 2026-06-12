"use client";

import { useEffect, useRef, useState } from "react";
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

type SafetyIssue = {
  code: string;
  label: string;
  detail: string;
};

const TOUR_STORAGE_KEY = "berna-cms-tour-seen";

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
  const [issues, setIssues] = useState<SafetyIssue[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    try {
      const [pendingRes, versionsRes, safetyRes] = await Promise.all([
        fetch("/api/admin/cms/pending", { cache: "no-store" }),
        fetch("/api/admin/cms/versions", { cache: "no-store" }),
        fetch("/api/admin/cms/safety", { cache: "no-store" }),
      ]);
      const pendingData = await pendingRes.json();
      const versionsData = await versionsRes.json();
      const safetyData = await safetyRes.json();
      setPending(pendingData.pending ?? null);
      setVersions(versionsData.versions ?? []);
      setIssues(safetyData.issues ?? []);
    } catch {
      setPending(null);
      setVersions([]);
      setIssues([]);
    }
  }

  useEffect(() => {
    refresh();
    if (window.localStorage.getItem(TOUR_STORAGE_KEY) !== "1") {
      setTourOpen(true);
    }
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
  const hasSafetyIssues = issues.length > 0;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (count === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [count]);

  function closeTour() {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setTourOpen(false);
  }

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
    if (hasSafetyIssues) {
      setMessage("Modo seguro: corregí los problemas antes de publicar.");
      return;
    }
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
        if (Array.isArray(data.issues)) setIssues(data.issues);
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
      window.dispatchEvent(new Event("cms:drafts-discarded"));
      await refresh();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function downloadBackup() {
    setBusy("backup");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/backup", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "No se pudo descargar el backup.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `berna-cms-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Backup descargado.");
    } finally {
      setBusy(null);
    }
  }

  async function importBackup(file: File) {
    const first = window.confirm(
      "Vas a importar un backup y reemplazar el contenido publicado y los borradores actuales."
    );
    if (!first) return;
    const second = window.confirm("Confirmación final: esta acción se publica al instante.");
    if (!second) return;
    setBusy("import");
    setMessage(null);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const res = await fetch("/api/admin/cms/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo importar el backup.");
        return;
      }
      setMessage("Backup importado.");
      await refresh();
      router.refresh();
    } catch {
      setMessage("El archivo no es un JSON válido.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
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
      {tourOpen && (
        <div className="mb-4 rounded-lg border border-ink bg-cream p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-black uppercase tracking-tight text-lg text-ink">
                Tour rápido del editor
              </p>
              <ol className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                <li>1. Editá textos, colores, logo y secciones: todo queda en borrador.</li>
                <li>2. Usá preview para revisar drafts sin cambiar el sitio público.</li>
                <li>3. Publicar copia el borrador al sitio y guarda una versión.</li>
                <li>4. El modo seguro bloquea valores rotos antes de publicar.</li>
                <li>5. Historial, revertir y backup te dejan volver atrás.</li>
                <li>6. Si salís con cambios pendientes, el navegador te avisa.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={closeTour}
              className="rounded bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
            >
              No mostrar de nuevo
            </button>
          </div>
        </div>
      )}
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
            <p
              className={`mt-2 text-xs font-bold ${
                message.includes("No ") || message.includes("Modo seguro")
                  ? "text-amber-800"
                  : "text-green-700"
              }`}
            >
              {message}
            </p>
          )}
          {hasSafetyIssues && (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                Modo seguro activo
              </p>
              <div className="mt-2 space-y-1">
                {issues.map((issue) => (
                  <p key={issue.code} className="text-xs text-amber-900">
                    <span className="font-bold">{issue.label}:</span>{" "}
                    {issue.detail}
                  </p>
                ))}
              </div>
            </div>
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
            disabled={busy !== null || count === 0 || hasSafetyIssues}
            className="rounded bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
          >
            {busy === "publish" ? "Publicando..." : "Publicar cambios"}
          </button>
        </div>
      </div>

      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
          Backup del CMS
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadBackup}
            disabled={busy !== null}
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-40"
          >
            {busy === "backup" ? "Preparando..." : "Descargar backup"}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:border-black hover:text-ink disabled:opacity-40"
          >
            {busy === "import" ? "Importando..." : "Importar backup"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importBackup(file);
            }}
          />
        </div>
      </details>

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
