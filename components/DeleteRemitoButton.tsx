"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Borra el remito DEFINITIVAMENTE (irreversible). Pide confirmación explícita
// con el número, para no borrar por error. Distinto de "Archivar", que es
// recuperable.
export default function DeleteRemitoButton({
  id,
  number,
}: {
  id: string;
  number: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const label = `REMITO #${String(number).padStart(6, "0")}`;
    if (
      !confirm(
        `¿Eliminar ${label} para SIEMPRE? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/remitos/${id}?hard=1`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo eliminar el remito.");
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
      onClick={remove}
      disabled={busy}
      className="text-[11px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 disabled:opacity-40"
    >
      {busy ? "…" : "Eliminar"}
    </button>
  );
}
