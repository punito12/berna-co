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
};

// One editable row: a price input per empanado + availability toggle + save.
export default function ProductEditor({ product }: { product: ProductRow }) {
  const router = useRouter();

  // Local editable copy of the prices, keyed by empanado (as strings for input).
  const initial: Record<string, string> = {};
  for (const b of product.breadcrumbs) {
    initial[b] = String(product.prices[b] ?? 0);
  }
  const [prices, setPrices] = useState<Record<string, string>>(initial);
  const [available, setAvailable] = useState(product.available);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  // Dirty = any price changed, or availability changed.
  const dirty =
    available !== product.available ||
    product.breadcrumbs.some(
      (b) => Number(prices[b]) !== (product.prices[b] ?? 0)
    );

  function setPrice(breadcrumb: string, value: string) {
    setPrices((prev) => ({ ...prev, [breadcrumb]: value }));
    setStatus("idle");
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const numeric: Record<string, number> = {};
      for (const b of product.breadcrumbs) numeric[b] = Number(prices[b]);

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: numeric, available }),
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

      {/* One price input per empanado */}
      <div className="mt-4 flex flex-wrap items-end gap-4">
        {product.breadcrumbs.map((b) => (
          <label key={b} className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
              {BREADCRUMB_LABELS[b] ?? b} — $
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={prices[b] ?? "0"}
              onChange={(e) => setPrice(b, e.target.value)}
              className="w-28 rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
            />
          </label>
        ))}

        <div className="ml-auto flex items-center gap-3">
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
