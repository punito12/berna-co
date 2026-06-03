"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ActionsData = {
  kind: "ORDER" | "MANUAL";
  id: string;
  shortId: string;
  status: string;
  balance: number;
  total: number;
  customerName: string;
  customerPhone: string | null;
  itemsText: string; // "2x Peceto (Keto), 1x ..."
  totalText: string; // formatted pesos
};

const METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

// Status + actions bar for the unified detail. Status change, register payment,
// print, WhatsApp, edit, and hard-delete.
export default function SaleDetailActions(props: ActionsData) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const cancelled = props.status === "CANCELLED";

  async function setStatus(next: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: props.kind, id: props.id, status: next }),
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

  async function hardDelete() {
    if (
      !confirm(
        "BORRAR DEFINITIVAMENTE este pedido. Esto elimina el registro por completo (distinto de cancelar). ¿Seguro?"
      )
    )
      return;
    if (!confirm("Confirmá de nuevo: se borra para siempre y se revierte stock y caja.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: props.kind, id: props.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo eliminar.");
        return;
      }
      router.push("/admin/operaciones/ventas");
    } finally {
      setBusy(false);
    }
  }

  function whatsapp() {
    const phone = (props.customerPhone || "").replace(/[^0-9]/g, "");
    const msg = `Hola ${props.customerName}! Te paso el resumen de tu pedido #${props.shortId}:\n${props.itemsText}\nTotal: ${props.totalText}\n¡Gracias!`;
    const base = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(base, "_blank");
  }

  return (
    <div className="print:hidden">
      {cancelled ? (
        <div className="rounded-lg border border-line bg-cream/40 px-4 py-3 text-sm text-muted">
          Este pedido está cancelado. No se puede reactivar — si lo necesitás
          activo, cargalo de nuevo.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {props.status !== "DELIVERED" && (
            <button
              type="button"
              onClick={() => setStatus("DELIVERED")}
              disabled={busy}
              className="bg-blue-700 px-4 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
            >
              Marcar entregado
            </button>
          )}
          {props.balance > 0 && (
            <button
              type="button"
              onClick={() => setPaying((v) => !v)}
              className="bg-green-700 px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
            >
              Registrar pago
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
            Cancelar
          </button>
        </div>
      )}

      {/* Secondary actions (always available) */}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-line px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:border-black"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={whatsapp}
          className="border border-line px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:border-black"
        >
          WhatsApp
        </button>
        <a
          href={`/admin/operaciones/ventas/${
            props.kind === "ORDER" ? "order" : "sale"
          }/${props.id}/editar`}
          className="border border-line px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:border-black"
        >
          Editar
        </a>
        <button
          type="button"
          onClick={hardDelete}
          disabled={busy}
          className="ml-auto px-4 py-2 font-bold uppercase tracking-widest text-xs text-muted hover:text-red-600 disabled:opacity-50"
        >
          Borrar definitivo
        </button>
      </div>

      {/* Payment modal (inline) */}
      {paying && props.balance > 0 && (
        <PaymentBox
          kind={props.kind}
          id={props.id}
          balance={props.balance}
          onDone={() => {
            setPaying(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PaymentBox({
  kind,
  id,
  balance,
  onDone,
}: {
  kind: "ORDER" | "MANUAL";
  id: string;
  balance: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("EFECTIVO");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          ...(kind === "ORDER" ? { orderId: id } : { saleId: id }),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo registrar el pago.");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-cream/30 p-3"
    >
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Monto ($) — saldo {balance}
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
        {busy ? "…" : "Confirmar pago"}
      </button>
      {err && <p className="w-full text-xs font-bold text-red-600">{err}</p>}
    </form>
  );
}
