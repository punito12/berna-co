"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductRow = {
  id: string;
  name: string;
  available: boolean;
  breadcrumbs: string[]; // which empanados this product offers
  prices: Record<string, number>; // current price per empanado
  stocks: Record<string, number>; // current stock per empanado
};

// One editable row: price + stock input per empanado + availability + save.
export default function ProductEditor({ product }: { product: ProductRow }) {
  const router = useRouter();

  // Local editable copies, keyed by empanado (as strings for the inputs).
  const initialPrices: Record<string, string> = {};
  const initialStocks: Record<string, string> = {};
  for (const b of product.breadcrumbs) {
    initialPrices[b] = String(product.prices[b] ?? 0);
    initialStocks[b] = String(product.stocks[b] ?? 0);
  }
  const [prices, setPrices] = useState<Record<string, string>>(initialPrices);
  const [stocks, setStocks] = useState<Record<string, string>>(initialStocks);
  const [available, setAvailable] = useState(product.available);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  // Dirty = any price/stock changed, or availability changed.
  const dirty =
    available !== product.available ||
    product.breadcrumbs.some(
      (b) =>
        Number(prices[b]) !== (product.prices[b] ?? 0) ||
        Number(stocks[b]) !== (product.stocks[b] ?? 0)
    );

  function setPrice(b: string, value: string) {
    setPrices((prev) => ({ ...prev, [b]: value }));
    setStatus("idle");
  }
  function setStock(b: string, value: string) {
    setStocks((prev) => ({ ...prev, [b]: value }));
    setStatus("idle");
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const numericPrices: Record<string, number> = {};
      const numericStocks: Record<string, number> = {};
      for (const b of product.breadcrumbs) {
        numericPrices[b] = Number(prices[b]);
        numericStocks[b] = Number(stocks[b]);
      }

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prices: numericPrices,
          stocks: numericStocks,
          available,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold uppercase tracking-tight text-ink">
          {product.name}
        </p>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => {
              setAvailable(e.target.checked);
              setStatus("idle");
            }}
            className="h-4 w-4 accent-black"
          />
          <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
            Disponible
          </span>
        </label>
      </div>

      {/* One price + stock pair per empanado */}
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4">
        {product.breadcrumbs.map((b) => (
          <div key={b} className="rounded-md bg-cream/60 p-3">
            <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-ink">
              {BREADCRUMB_LABELS[b] ?? b}
            </p>
            <div className="flex items-end gap-3">
              <label className="block">
                <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                  Precio $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={prices[b] ?? "0"}
                  onChange={(e) => setPrice(b, e.target.value)}
                  className="w-24 rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                  Stock
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={stocks[b] ?? "0"}
                  onChange={(e) => setStock(b, e.target.value)}
                  className="w-20 rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                />
              </label>
            </div>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-3 self-center">
          {status === "saved" && (
            <span className="text-xs font-bold text-ink">Guardado ✓</span>
          )}
          {status === "error" && (
            <span className="text-xs font-bold text-ink">Error ✕</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
