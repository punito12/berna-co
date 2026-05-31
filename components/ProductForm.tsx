"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

const CATEGORIES = [
  { value: "CARNE", label: "Carne" },
  { value: "POLLO", label: "Pollo" },
  { value: "CERDO", label: "Cerdo" },
  { value: "VEGANO", label: "Vegano" },
];
const BREADCRUMBS = ["TRADITIONAL", "INTEGRAL", "KETO"];

export type ProductFormValues = {
  id?: string; // present in edit mode
  name: string;
  description: string;
  category: string;
  weightGrams: number;
  isNew: boolean;
  available: boolean;
  breadcrumbs: string[];
  prices: Record<string, number>;
  stocks: Record<string, number>;
  images: Record<string, string[]>; // up to 2 photo paths per empanado
};

const PHOTO_SLOTS = [0, 1]; // two photos per empanado

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

export default function ProductForm({
  initial,
  mode,
  onDone,
}: {
  initial: ProductFormValues;
  mode: "create" | "edit";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category || "CARNE");
  const [weight, setWeight] = useState(String(initial.weightGrams || 1000));
  const [isNew, setIsNew] = useState(initial.isNew);
  const [available, setAvailable] = useState(initial.available);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(initial.breadcrumbs);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      BREADCRUMBS.map((b) => [b, String(initial.prices[b] ?? 0)])
    )
  );
  const [stocks, setStocks] = useState<Record<string, string>>(
    Object.fromEntries(
      BREADCRUMBS.map((b) => [b, String(initial.stocks[b] ?? 0)])
    )
  );
  // Photos as a 2-slot array per empanado.
  const [images, setImages] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const b of BREADCRUMBS) out[b] = initial.images[b] ?? [];
    return out;
  });
  // Tracks which slot is uploading, keyed "breadcrumb:slot".
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBreadcrumb(b: string) {
    setBreadcrumbs((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
    setError(null);
  }

  function setPhoto(breadcrumb: string, slot: number, url: string) {
    setImages((prev) => {
      const arr = [...(prev[breadcrumb] ?? [])];
      arr[slot] = url;
      return { ...prev, [breadcrumb]: arr };
    });
  }

  async function uploadImage(breadcrumb: string, slot: number, file: File) {
    setUploading(`${breadcrumb}:${slot}`);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo subir la imagen.");
      setPhoto(breadcrumb, slot, data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Poné un nombre.");
    if (breadcrumbs.length === 0)
      return setError("Elegí al menos un tipo de empanado.");

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        category,
        weightGrams: Number(weight),
        isNew,
        available,
        breadcrumbs,
        prices: Object.fromEntries(breadcrumbs.map((b) => [b, Number(prices[b])])),
        stocks: Object.fromEntries(breadcrumbs.map((b) => [b, Number(stocks[b])])),
        images: Object.fromEntries(
          breadcrumbs.map((b) => [
            b,
            (images[b] ?? []).filter((u) => u && u.trim()),
          ])
        ),
      };
      const url =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${initial.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      router.refresh();
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial.id) return;
    if (
      !confirm(
        `¿Eliminar "${initial.name}"? Esta acción no se puede deshacer.`
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${initial.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar.");
      router.refresh();
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Name + category + weight */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Nombre
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Peceto de Pastura"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Categoría
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
          Descripción
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Ej: Corte de carne vacuna de alta calidad, criados a pasto."
        />
      </label>

      <div className="flex flex-wrap items-end gap-6">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Peso (gramos)
          </span>
          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-32 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
            placeholder="1000"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="h-4 w-4 accent-black"
          />
          <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
            Disponible
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isNew}
            onChange={(e) => setIsNew(e.target.checked)}
            className="h-4 w-4 accent-black"
          />
          <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
            Marcar como NEW
          </span>
        </label>
      </div>

      {/* Breadcrumbs selector */}
      <div>
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Empanados disponibles
        </p>
        <div className="flex flex-wrap gap-2">
          {BREADCRUMBS.map((b) => {
            const on = breadcrumbs.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBreadcrumb(b)}
                aria-pressed={on}
                className={`rounded-full border px-4 py-1.5 font-bold uppercase tracking-wide text-xs transition-colors ${
                  on
                    ? "border-black bg-black text-white"
                    : "border-line bg-white text-ink hover:border-black"
                }`}
              >
                {BREADCRUMB_LABELS[b] ?? b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-empanado: price, stock, image */}
      {breadcrumbs.length > 0 && (
        <div className="space-y-3">
          {BREADCRUMBS.filter((b) => breadcrumbs.includes(b)).map((b) => (
            <div
              key={b}
              className="flex flex-wrap items-end gap-4 rounded-md bg-cream/60 p-3"
            >
              <p className="w-full font-bold uppercase tracking-wide text-[11px] text-ink">
                {BREADCRUMB_LABELS[b] ?? b}
              </p>
              <label className="block">
                <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                  Precio $
                </span>
                <input
                  type="number"
                  min={0}
                  value={prices[b] ?? "0"}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, [b]: e.target.value }))
                  }
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
                  value={stocks[b] ?? "0"}
                  onChange={(e) =>
                    setStocks((s) => ({ ...s, [b]: e.target.value }))
                  }
                  className="w-20 rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                />
              </label>
              {/* Two photo slots per empanado */}
              {PHOTO_SLOTS.map((slot) => {
                const current = images[b]?.[slot];
                const key = `${b}:${slot}`;
                return (
                  <div key={slot} className="flex items-end gap-2">
                    <div
                      className="h-16 w-16 shrink-0 rounded border border-line bg-white bg-cover bg-center"
                      style={
                        current
                          ? { backgroundImage: `url('${current}')` }
                          : undefined
                      }
                      aria-label={`Foto ${slot + 1}`}
                    />
                    <label className="cursor-pointer border border-black px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-ink hover:bg-black hover:text-white">
                      {uploading === key
                        ? "Subiendo…"
                        : current
                        ? `Cambiar ${slot + 1}`
                        : `Foto ${slot + 1}`}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImage(b, slot, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm font-bold text-ink">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
          >
            Eliminar producto
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              disabled={saving}
              className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading !== null}
            className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
