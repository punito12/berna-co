"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductOption = {
  id: string;
  name: string;
  breadcrumbs: string[];
  prices: Record<string, number>;
};

type ItemRow = {
  productId: string;
  productName: string;
  breadcrumbType: string;
  quantity: string;
  unitPrice: string;
};

type Initial = {
  customerName: string;
  customerPhone: string;
  address: string;
  scheduledDate: string;
  scheduledSlot: string;
  notes: string;
  deliveryType: string | null;
  items: ItemRow[];
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SaleEditor({
  kind,
  id,
  backHref,
  initial,
  products,
}: {
  kind: "ORDER" | "MANUAL";
  id: string;
  backHref: string;
  initial: Initial;
  products: ProductOption[];
}) {
  const router = useRouter();
  const isOrder = kind === "ORDER";

  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [address, setAddress] = useState(initial.address);
  const [scheduledDate, setScheduledDate] = useState(initial.scheduledDate);
  const [scheduledSlot, setScheduledSlot] = useState(initial.scheduledSlot);
  const [notes, setNotes] = useState(initial.notes);
  const [lines, setLines] = useState<ItemRow[]>(
    initial.items.length
      ? initial.items
      : [{ productId: "", productName: "", breadcrumbType: "", quantity: "", unitPrice: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(i: number, patch: Partial<ItemRow>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      { productId: "", productName: "", breadcrumbType: "", quantity: "", unitPrice: "" },
    ]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function priceFor(p: ProductOption, bc: string): number {
    const specific = p.prices?.[bc];
    if (typeof specific === "number" && specific > 0) return specific;
    return 0;
  }

  function pickProduct(i: number, productId: string) {
    if (!productId) {
      updateLine(i, { productId: "", breadcrumbType: "" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    const firstBc = p?.breadcrumbs?.[0] ?? "";
    updateLine(i, {
      productId,
      productName: p?.name ?? "",
      breadcrumbType: firstBc,
      unitPrice: p ? String(priceFor(p, firstBc) || "") : "",
    });
  }

  const total = useMemo(
    () =>
      lines.reduce(
        (a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
        0
      ),
    [lines]
  );

  async function save() {
    setError(null);
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        breadcrumbType: l.breadcrumbType || null,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (items.length === 0)
      return setError("Agregá al menos un producto con cantidad.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/sales-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          id,
          items,
          notes,
          ...(isOrder
            ? {
                customerName,
                customerPhone,
                address,
                scheduledDate: scheduledDate || null,
                scheduledSlot: scheduledSlot || null,
              }
            : {}),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "No se pudo guardar.");
        return;
      }
      router.push(backHref);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Customer / delivery (orders) */}
      {isOrder && (
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-muted">
            Cliente y entrega
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputClass}
              />
            </Field>
            {initial.deliveryType === "DELIVERY" && (
              <div className="sm:col-span-2">
                <Field label="Dirección">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
            <Field label="Fecha de entrega">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Franja">
              <input
                value={scheduledSlot}
                onChange={(e) => setScheduledSlot(e.target.value)}
                className={inputClass}
                placeholder="Ej: 10:00–12:00"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-muted">
          Productos
        </h2>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const p = products.find((x) => x.id === line.productId);
            const subtotal =
              (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md bg-cream/60 p-3 sm:grid-cols-[1fr_110px_80px_110px_auto] sm:items-end"
              >
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Producto
                  </span>
                  <select
                    value={line.productId}
                    onChange={(e) => pickProduct(i, e.target.value)}
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  >
                    <option value="">— Elegí —</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Empanado
                  </span>
                  <select
                    value={line.breadcrumbType}
                    onChange={(e) =>
                      updateLine(i, { breadcrumbType: e.target.value })
                    }
                    disabled={!p}
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  >
                    {!p && <option value="">—</option>}
                    {p?.breadcrumbs.map((b) => (
                      <option key={b} value={b}>
                        {BREADCRUMB_LABELS[b] ?? b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Cant.
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: e.target.value })
                    }
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Precio/u
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(i, { unitPrice: e.target.value })
                    }
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">
                    {pesos(subtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    aria-label="Quitar"
                    className="h-9 border border-line px-3 font-bold text-muted hover:border-black hover:text-ink disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
        >
          + Agregar producto
        </button>
        <div className="mt-4 flex justify-between border-t border-line pt-3 font-black text-ink">
          <span className="uppercase tracking-wide">Total productos</span>
          <span className="text-lg">{pesos(total)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-line bg-white p-5">
        <Field label="Notas">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <a
          href={backHref}
          className="px-6 py-3 font-bold uppercase tracking-widest text-sm text-muted hover:text-ink"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
