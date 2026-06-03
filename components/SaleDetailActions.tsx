"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Status + actions bar for the unified detail. Part 1 covers the status change
// (Confirmado → Entregado, Cancelar). Pay / print / WhatsApp / edit / delete
// are added in later parts.
export default function SaleDetailActions({
  kind,
  id,
  status,
}: {
  kind: "ORDER" | "MANUAL";
  id: string;
  shortId: string;
  status: string;
  balance: number;
  customerName: string;
  customerPhone: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancelled = status === "CANCELLED";

  async function setStatus(next: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, status: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo actualizar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (cancelled) {
    return (
      <div className="rounded-lg border border-line bg-cream/40 px-4 py-3 text-sm text-muted print:hidden">
        Este pedido está cancelado. No se puede reactivar — si lo necesitás
        activo, cargalo de nuevo.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {status !== "DELIVERED" && (
        <button
          type="button"
          onClick={() => setStatus("DELIVERED")}
          disabled={busy}
          className="bg-blue-700 px-4 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          Marcar entregado
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          setStatus(
            "CANCELLED",
            "¿Cancelar este pedido? Se repone el stock y se ajusta la caja. No se puede reactivar."
          )
        }
        disabled={busy}
        className="border border-red-300 px-4 py-2 font-bold uppercase tracking-widest text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Cancelar pedido
      </button>
    </div>
  );
}
