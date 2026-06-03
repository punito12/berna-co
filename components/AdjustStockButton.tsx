"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

// Inline manual stock adjustment for one (product, empanado). The reason is
// required. Positive adds, negative removes (WASTE if it's a loss).
export default function AdjustStockButton({
  productId,
  breadcrumbType,
  currentStock,
}: {
  productId: string;
  breadcrumbType: string;
  currentStock: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("ADJUSTMENT");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/stock/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          breadcrumbType,
          delta: Number(delta),
          reason,
          type,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      setOpen(false);
      setDelta("");
      setReason("");
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
        className="rounded border border-line px-2 py-1 font-bold uppercase tracking-wide text-[10px] text-muted hover:border-black hover:text-ink"
      >
        Ajustar
      </button>
    );
  }

  const preview =
    delta !== "" ? currentStock + (Number(delta) || 0) : currentStock;

  return (
    <form
      onSubmit={submit}
      className="mt-2 w-full rounded-lg border border-line bg-cream/30 p-3"
    >
      <p className="mb-2 font-bold uppercase tracking-wide text-[10px] text-muted">
        Ajustar {BREADCRUMB_LABELS[breadcrumbType] ?? breadcrumbType} (actual:{" "}
        {currentStock}
        {delta !== "" ? ` → ${preview}` : ""})
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Cambio (+/−)
          </span>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="w-24 rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
            placeholder="Ej: -2"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Tipo
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
          >
            <option value="ADJUSTMENT">Ajuste</option>
            <option value="WASTE">Merma</option>
          </select>
        </label>
        <label className="block flex-1">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Motivo (obligatorio)
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
            placeholder="Ej: rotura, conteo físico"
            required
          />
        </label>
      </div>
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-4 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar ajuste"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
