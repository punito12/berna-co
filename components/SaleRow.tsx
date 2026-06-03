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
  paymentStatus: string; // PAID | PARTIAL | PENDING
  deliveryStatus: string; // PENDING | DELIVERED | CANCELLED
};

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

const PAY_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  PENDING: "bg-red-100 text-red-700",
};
const PAY_LABELS: Record<string, string> = {
  PAID: "Pagado",
  PARTIAL: "Parcial",
  PENDING: "A deber",
};
const DELIV_STYLES: Record<string, string> = {
  DELIVERED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-600 line-through",
  PENDING: "bg-cream text-muted",
};
const DELIV_LABELS: Record<string, string> = {
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  PENDING: "Pendiente",
};

export default function SaleRow({ sale }: { sale: Sale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancelled = sale.deliveryStatus === "CANCELLED";

  async function call(body: object, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function remove() {
    if (!confirm("¿Eliminar esta venta? Se reintegra el stock y se quita de la caja."))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}`, {
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
    <div
      className={`rounded-lg border border-line bg-white px-4 py-3 ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold uppercase tracking-tight text-sm text-ink">
            {sale.customerName || "Sin cliente"}
            <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {SALE_CHANNEL_LABELS[sale.channel] ?? sale.channel}
            </span>
            <span
              className={`ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                PAY_STYLES[sale.paymentStatus] ?? "bg-cream text-muted"
              }`}
            >
              {PAY_LABELS[sale.paymentStatus] ?? sale.paymentStatus}
            </span>
            <span
              className={`ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                DELIV_STYLES[sale.deliveryStatus] ?? "bg-cream text-muted"
              }`}
            >
              {DELIV_LABELS[sale.deliveryStatus] ?? sale.deliveryStatus}
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
        <span className="font-black text-ink">{pesos(sale.net)}</span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        {sale.paymentStatus !== "PAID" && !cancelled && (
          <button
            type="button"
            onClick={() =>
              call({ action: "markPaid" }, "¿Marcar como pagada? Se registra el cobro en caja.")
            }
            disabled={busy}
            className="bg-green-700 px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
          >
            Pagado
          </button>
        )}
        {sale.deliveryStatus !== "DELIVERED" && !cancelled && (
          <button
            type="button"
            onClick={() =>
              call({ action: "deliveryStatus", status: "DELIVERED" })
            }
            disabled={busy}
            className="bg-blue-700 px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
          >
            Entregado
          </button>
        )}
        {!cancelled ? (
          <button
            type="button"
            onClick={() =>
              call(
                { action: "deliveryStatus", status: "CANCELLED" },
                "¿Cancelar la venta? Se reintegra el stock y se revierte la caja."
              )
            }
            disabled={busy}
            className="border border-line px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-muted hover:border-black hover:text-ink disabled:opacity-50"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              call({ action: "deliveryStatus", status: "PENDING" })
            }
            disabled={busy}
            className="border border-line px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-muted hover:border-black hover:text-ink disabled:opacity-50"
          >
            Reactivar
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="ml-auto font-bold uppercase tracking-widest text-[11px] text-muted hover:text-red-600 disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
