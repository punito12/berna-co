"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};

// One editable row: price input + availability toggle + save.
export default function ProductEditor({ product }: { product: ProductRow }) {
  const router = useRouter();
  const [price, setPrice] = useState(String(product.price));
  const [available, setAvailable] = useState(product.available);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  // Dirty = differs from what's saved in the DB.
  const dirty =
    Number(price) !== product.price || available !== product.available;

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price), available }),
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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white p-4">
      <p className="min-w-[140px] flex-1 font-bold uppercase tracking-tight text-ink">
        {product.name}
      </p>

      <label className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
          Precio $
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            setStatus("idle");
          }}
          className="w-28 rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
        />
      </label>

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

      <div className="flex items-center gap-3">
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
  );
}
