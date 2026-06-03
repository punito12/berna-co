"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductOption = {
  id: string;
  name: string;
  breadcrumbs: string[];
  stocks: Record<string, number>;
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Form to record production: product + empanado + quantity (adds stock).
export default function ProductionForm({
  products,
}: {
  products: ProductOption[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [breadcrumb, setBreadcrumb] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setBreadcrumb(p?.breadcrumbs[0] ?? "");
  }

  const currentStock =
    product && breadcrumb ? product.stocks[breadcrumb] ?? 0 : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stock/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          breadcrumbType: breadcrumb,
          quantity: Number(quantity),
          date,
          notes,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      setQuantity("");
      setNotes("");
      setMsg("✓ Producción cargada.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Producto
          </span>
          <select
            value={productId}
            onChange={(e) => pickProduct(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">— Elegí un producto —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Empanado
          </span>
          <select
            value={breadcrumb}
            onChange={(e) => setBreadcrumb(e.target.value)}
            className={inputClass}
            disabled={!product}
            required
          >
            {!product && <option value="">—</option>}
            {product?.breadcrumbs.map((b) => (
              <option key={b} value={b}>
                {BREADCRUMB_LABELS[b] ?? b}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Cantidad producida (unidades)
          </span>
          <input
            type="number"
            min={1}
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
            required
          />
          {currentStock !== null && (
            <span className="mt-1 block text-xs text-muted">
              Stock actual: {currentStock}
              {quantity ? ` → ${currentStock + (Number(quantity) || 0)}` : ""}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Fecha
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
              Notas (opcional)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Ej: lote del día"
            />
          </label>
        </div>
      </div>
      {err && <p className="mt-3 text-sm font-bold text-red-600">{err}</p>}
      {msg && <p className="mt-3 text-sm font-bold text-green-700">{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Cargar producción"}
      </button>
    </form>
  );
}
