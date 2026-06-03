"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Purchase = {
  id: string;
  date: string; // formatted
  supplierName: string;
  itemsCount: number;
  total: number;
  balance: number;
  paymentStatus: string;
};

const METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  PENDING: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  PAID: "Pagada",
  PARTIAL: "Parcial",
  PENDING: "A pagar",
};

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, purchase.balance)));
  const [method, setMethod] = useState("EFECTIVO");

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: purchase.id,
          amount: Number(amount),
          method,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo registrar el pago.");
        return;
      }
      setPaying(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta compra? Se revierte el egreso de caja."))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/purchases/${purchase.id}`, {
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
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold uppercase tracking-tight text-sm text-ink">
            {purchase.supplierName}
            <span
              className={`ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                STATUS_STYLES[purchase.paymentStatus] ?? "bg-cream text-muted"
              }`}
            >
              {STATUS_LABELS[purchase.paymentStatus] ?? purchase.paymentStatus}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {purchase.date} · {purchase.itemsCount} ítem
            {purchase.itemsCount === 1 ? "" : "s"}
            {purchase.balance > 0
              ? ` · saldo ${pesos(purchase.balance)}`
              : ""}
          </p>
        </div>
        <span className="font-black text-ink">{pesos(purchase.total)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {purchase.balance > 0 && !paying && (
          <button
            type="button"
            onClick={() => setPaying(true)}
            className="bg-green-700 px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white"
          >
            Registrar pago
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

      {paying && (
        <form
          onSubmit={pay}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-cream/30 p-3"
        >
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
              Monto ($)
            </span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
              Método
            </span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-green-700 px-4 py-2 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setPaying(false)}
            className="px-3 py-2 font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
