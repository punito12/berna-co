"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SALE_CHANNEL_LABELS } from "@/lib/management";

type Sale = {
  id: string;
  soldAt: string; // already formatted
  channel: string;
  customerName: string | null;
  itemsCount: number;
  gross: number;
  discountAmount: number;
  net: number;
};

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SaleRow({ sale }: { sale: Sale }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm("¿Eliminar esta venta?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <div>
        <p className="font-bold uppercase tracking-tight text-sm text-ink">
          {sale.customerName || "Sin cliente"}
          <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {SALE_CHANNEL_LABELS[sale.channel] ?? sale.channel}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {sale.soldAt} · {sale.itemsCount} producto
          {sale.itemsCount === 1 ? "" : "s"}
          {sale.discountAmount > 0
            ? ` · dto ${pesos(sale.discountAmount)}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-black text-ink">{pesos(sale.net)}</span>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          aria-label="Eliminar venta"
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
