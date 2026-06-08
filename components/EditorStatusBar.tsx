"use client";

import { useEffect, useState } from "react";

type Pending = { total: number } | null;

// Top status bar of the site editor: shows pending-changes count. Preview /
// publish / discard actions land in Fase 4 (placeholders for now).
export default function EditorStatusBar() {
  const [pending, setPending] = useState<Pending>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/admin/cms/pending", { cache: "no-store" });
      const d = await r.json();
      setPending(d.pending ?? null);
    } catch {
      setPending(null);
    }
  }

  useEffect(() => {
    refresh();
    // Refresh when the window regains focus (after editing on another tab).
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const count = pending?.total ?? 0;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <span
        className={`text-sm font-bold ${
          count > 0 ? "text-amber-700" : "text-muted"
        }`}
      >
        {count > 0
          ? `Tenés ${count} cambio${count === 1 ? "" : "s"} sin publicar`
          : "Sin cambios pendientes"}
      </span>
      <span className="text-[11px] uppercase tracking-widest text-muted">
        Editás un borrador · el público ve lo publicado
      </span>
    </div>
  );
}
