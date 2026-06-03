"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFERENCIA: "Transferencia",
};
const METHODS = ["EFECTIVO", "MERCADO_PAGO", "TRANSFERENCIA"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Inline form to register a payment against one sale/order. Pre-fills the
// amount with the outstanding balance.
export default function PaymentForm({
  saleId,
  orderId,
  balance,
}: {
  saleId?: string;
  orderId?: string;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, balance)));
  const [method, setMethod] = useState("EFECTIVO");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
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
          date,
          notes,
          saleId,
          orderId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo registrar el pago.");
        return;
      }
      setOpen(false);
      setNotes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-green-700 px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white"
      >
        Registrar pago
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-cream/30 p-3 sm:grid-cols-4"
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
          className={inputClass}
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
          className={inputClass}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Fecha
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Notas
        </span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          placeholder="Opcional"
        />
      </label>
      {err && (
        <p className="col-span-full text-xs font-bold text-red-600">{err}</p>
      )}
      <div className="col-span-full flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-green-700 px-4 py-2 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Confirmar pago"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black";
