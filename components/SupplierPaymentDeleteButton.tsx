"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Delete a supplier payment. The purchase status is recomputed server-side; the
// matching Caja expense stays (remove it from Caja manually if needed).
export default function SupplierPaymentDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("¿Eliminar este pago? El saldo se recalcula.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/supplier-payments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo eliminar.");
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
      aria-label="Eliminar pago"
      className="text-muted transition-colors hover:text-red-600 disabled:opacity-50"
    >
      ✕
    </button>
  );
}
