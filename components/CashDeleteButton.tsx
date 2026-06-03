"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Small inline delete for a Caja movement.
export default function CashDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("¿Eliminar este movimiento de caja?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cash/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo eliminar.");
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
      aria-label="Eliminar movimiento"
      className="text-muted transition-colors hover:text-red-600 disabled:opacity-50"
    >
      ✕
    </button>
  );
}
