"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchiveRemitoButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function archive() {
    if (!confirm("¿Archivar este remito? Queda guardado en el historial.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/remitos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo archivar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={archive}
      disabled={busy}
      className="text-[11px] font-bold uppercase tracking-widest text-muted hover:text-red-600 disabled:opacity-40"
    >
      {busy ? "…" : "Archivar"}
    </button>
  );
}
