"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductOption = { id: string; name: string; breadcrumbs: string[] };

type RecipeListItem = {
  id: string;
  productId: string;
  productName: string;
  breadcrumbType: string;
  breadcrumbLabel: string;
  yieldKg: number;
  packagingPerKg: number;
  active: boolean;
  computedCostPerKg: number;
  ingredientsCount: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }[];
};

const UNITS = ["KG", "G", "UNIDAD", "L", "ML"];
const inputClass =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RecipeManager({
  recipes,
  products,
}: {
  recipes: RecipeListItem[];
  products: ProductOption[];
}) {
  const [editing, setEditing] = useState<RecipeListItem | "new" | null>(null);

  return (
    <div>
      <div className="mb-4">
        {editing ? (
          <RecipeForm
            products={products}
            existing={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
          >
            + Crear receta
          </button>
        )}
      </div>

      {recipes.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
          Todavía no cargaste recetas.
        </p>
      ) : (
        <div className="space-y-2">
          {recipes.map((r) => (
            <RecipeItem key={r.id} recipe={r} onEdit={() => setEditing(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeItem({
  recipe,
  onEdit,
}: {
  recipe: RecipeListItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("¿Eliminar esta receta?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <div>
        <p className="font-bold uppercase tracking-tight text-ink">
          {recipe.productName}
          <span className="ml-2 text-muted">· {recipe.breadcrumbLabel}</span>
          {recipe.active && (
            <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
              ƒ activa
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {recipe.ingredientsCount} ingrediente
          {recipe.ingredientsCount === 1 ? "" : "s"} · rinde {recipe.yieldKg} kg
          · costo {pesos(recipe.computedCostPerKg)}/kg
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-red-600 disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

type IngRow = { name: string; quantity: string; unit: string; unitPrice: string };

function RecipeForm({
  products,
  existing,
  onDone,
}: {
  products: ProductOption[];
  existing: RecipeListItem | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEdit = !!existing;
  const [productId, setProductId] = useState(existing?.productId ?? "");
  const [breadcrumb, setBreadcrumb] = useState(existing?.breadcrumbType ?? "");
  const [yieldKg, setYieldKg] = useState(String(existing?.yieldKg ?? ""));
  const [packaging, setPackaging] = useState(
    String(existing?.packagingPerKg ?? 0)
  );
  const [active, setActive] = useState(existing?.active ?? false);
  const [ings, setIngs] = useState<IngRow[]>(
    existing?.ingredients.map((i) => ({
      name: i.name,
      quantity: String(i.quantity),
      unit: i.unit,
      unitPrice: String(i.unitPrice),
    })) ?? [{ name: "", quantity: "", unit: "KG", unitPrice: "" }]
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId);

  const { total, computed } = useMemo(() => {
    const subtotals = ings.map(
      (i) => (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)
    );
    const t = subtotals.reduce((a, b) => a + b, 0);
    const y = Number(yieldKg) || 0;
    const c = y > 0 ? Math.round(t / y + (Number(packaging) || 0)) : 0;
    return { total: t, computed: c };
  }, [ings, yieldKg, packaging]);

  function updateIng(i: number, patch: Partial<IngRow>) {
    setIngs((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          breadcrumbType: breadcrumb,
          yieldKg: Number(yieldKg),
          packagingPerKg: Number(packaging),
          active,
          ingredients: ings.map((i) => ({
            name: i.name,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.unitPrice),
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      router.refresh();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Producto
          </span>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              setBreadcrumb(p?.breadcrumbs[0] ?? "");
            }}
            disabled={isEdit}
            className={inputClass}
            required
          >
            <option value="">— Elegí —</option>
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
            disabled={isEdit || !product}
            className={inputClass}
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
            Rendimiento por batch (kg)
          </span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={yieldKg}
            onChange={(e) => setYieldKg(e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Packaging por kg ($)
          </span>
          <input
            type="number"
            min={0}
            value={packaging}
            onChange={(e) => setPackaging(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {/* Ingredients */}
      <p className="mb-2 mt-5 font-bold uppercase tracking-wide text-[11px] text-muted">
        Ingredientes
      </p>
      <div className="space-y-2">
        {ings.map((ing, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-md bg-cream/60 p-3 sm:grid-cols-[1fr_90px_90px_110px_90px_auto] sm:items-end"
          >
            <FieldMini label="Nombre">
              <input
                value={ing.name}
                onChange={(e) => updateIng(i, { name: e.target.value })}
                className={inputClass}
                placeholder="Ej: Nalga"
              />
            </FieldMini>
            <FieldMini label="Cant.">
              <input
                type="number"
                min={0}
                step="0.01"
                value={ing.quantity}
                onChange={(e) => updateIng(i, { quantity: e.target.value })}
                className={inputClass}
              />
            </FieldMini>
            <FieldMini label="Unidad">
              <select
                value={ing.unit}
                onChange={(e) => updateIng(i, { unit: e.target.value })}
                className={inputClass}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </FieldMini>
            <FieldMini label="Precio/u">
              <input
                type="number"
                min={0}
                value={ing.unitPrice}
                onChange={(e) => updateIng(i, { unitPrice: e.target.value })}
                className={inputClass}
              />
            </FieldMini>
            <div className="text-right text-sm font-bold text-ink">
              {pesos((Number(ing.quantity) || 0) * (Number(ing.unitPrice) || 0))}
            </div>
            <button
              type="button"
              onClick={() => setIngs((p) => p.filter((_, idx) => idx !== i))}
              disabled={ings.length === 1}
              className="h-9 border border-line px-3 font-bold text-muted hover:border-black disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setIngs((p) => [...p, { name: "", quantity: "", unit: "KG", unitPrice: "" }])
        }
        className="mt-2 border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
      >
        + Agregar ingrediente
      </button>

      {/* Computed cost */}
      <div className="mt-5 rounded-lg border border-line bg-cream/40 p-4">
        <div className="flex justify-between text-sm text-muted">
          <span>Subtotal ingredientes</span>
          <span>{pesos(total)}</span>
        </div>
        <div className="mt-1 flex justify-between font-black text-ink">
          <span className="uppercase tracking-wide">
            Costo calculado por kg
          </span>
          <span className="text-lg">{pesos(computed)}</span>
        </div>
        <label className="mt-3 flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-ink">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Usar esta receta para calcular el costo automáticamente
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-bold text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar receta"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FieldMini({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
