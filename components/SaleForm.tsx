"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductOption = { id: string; name: string; price: number };
type CustomerOption = {
  id: string;
  name: string;
  type: string;
  defaultDiscount: number;
};

type Line = {
  productId: string; // "" = free text
  productName: string;
  qtyKg: string;
  unitPrice: string;
};

const CHANNELS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "KIOSCO", label: "Kiosco" },
  { value: "WEB", label: "Web" },
];

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Form to load a manual sale: date, customer (list or free text), channel,
// multiple product lines (kg × unit price), an editable discount, and live
// totals. The server recomputes everything on save.
export default function SaleForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [soldAt, setSoldAt] = useState(today);
  const [channel, setChannel] = useState("WHATSAPP");
  const [customerId, setCustomerId] = useState(""); // "" = free text
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("0");
  const [discountTouched, setDiscountTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { productId: "", productName: "", qtyKg: "", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  function pickCustomer(id: string) {
    setCustomerId(id);
    if (id && !discountTouched) {
      const c = customers.find((x) => x.id === id);
      if (c) setDiscount(String(c.defaultDiscount));
    }
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function pickProduct(i: number, productId: string) {
    if (!productId) {
      updateLine(i, { productId: "", productName: "" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    updateLine(i, {
      productId,
      productName: p?.name ?? "",
      // Auto-fill unit price with the product's current price (editable).
      unitPrice: p ? String(p.price) : "",
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { productId: "", productName: "", qtyKg: "", unitPrice: "" },
    ]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Live totals (mirror of the server computation).
  const totals = useMemo(() => {
    let gross = 0;
    for (const l of lines) {
      const qty = Number(l.qtyKg) || 0;
      const price = Number(l.unitPrice) || 0;
      gross += Math.round(qty * price);
    }
    const pct = Math.min(100, Math.max(0, Number(discount) || 0));
    const discountAmount = Math.round((gross * pct) / 100);
    return { gross, discountAmount, net: gross - discountAmount };
  }, [lines, discount]);

  async function save() {
    setError(null);
    setSavedMsg(false);
    const items = lines
      .filter((l) => l.productName.trim() && Number(l.qtyKg) > 0)
      .map((l) => ({
        productId: l.productId || undefined,
        productName: l.productName.trim(),
        qtyKg: Number(l.qtyKg),
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (items.length === 0)
      return setError("Agregá al menos un producto con cantidad.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldAt: `${soldAt}T12:00:00`,
          channel,
          customerId: customerId || undefined,
          customerName: customerId ? undefined : customerName || undefined,
          discountPct: Number(discount) || 0,
          notes: notes || undefined,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      // Reset for the next sale.
      setLines([{ productId: "", productName: "", qtyKg: "", unitPrice: "" }]);
      setCustomerId("");
      setCustomerName("");
      setDiscount("0");
      setDiscountTouched(false);
      setNotes("");
      setSavedMsg(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5">
      {/* Date / channel / customer */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Fecha
          </span>
          <input
            type="date"
            value={soldAt}
            onChange={(e) => setSoldAt(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Canal
          </span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={inputClass}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Cliente
          </span>
          <select
            value={customerId}
            onChange={(e) => pickCustomer(e.target.value)}
            className={inputClass}
          >
            <option value="">— Nombre libre —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!customerId && (
        <label className="mt-3 block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Nombre del cliente (libre)
          </span>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Juan (WhatsApp)"
          />
        </label>
      )}

      {/* Product lines */}
      <div className="mt-6">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Productos
        </p>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const subtotal =
              (Number(line.qtyKg) || 0) * (Number(line.unitPrice) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md bg-cream/60 p-3 sm:grid-cols-[1fr_90px_120px_110px_auto] sm:items-end"
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
                    <option value="">— Otro / libre —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {!line.productId && (
                    <input
                      type="text"
                      value={line.productName}
                      onChange={(e) =>
                        updateLine(i, { productName: e.target.value })
                      }
                      className="mt-1 w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                      placeholder="Nombre del producto"
                    />
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Kg
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={line.qtyKg}
                    onChange={(e) => updateLine(i, { qtyKg: e.target.value })}
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Precio/kg
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
                <div className="text-right">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Subtotal
                  </span>
                  <span className="block py-1.5 font-bold text-ink">
                    {pesos(subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  aria-label="Quitar producto"
                  className="h-9 border border-line px-3 font-bold text-muted hover:border-black hover:text-ink disabled:opacity-30"
                >
                  ✕
                </button>
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
      </div>

      {/* Discount + notes */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Descuento %
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value);
              setDiscountTouched(true);
            }}
            className="w-32 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Nota (opcional)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {/* Totals */}
      <div className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>Facturación bruta</span>
          <span>{pesos(totals.gross)}</span>
        </div>
        <div className="flex items-center justify-between text-muted">
          <span>Descuento</span>
          <span>− {pesos(totals.discountAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 font-black text-ink">
          <span className="uppercase tracking-wide">Total neto</span>
          <span className="text-xl">{pesos(totals.net)}</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-bold text-ink">{error}</p>}
      {savedMsg && (
        <p className="mt-4 text-sm font-bold text-ink">Venta guardada ✓</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 w-full bg-black px-4 py-3 font-bold uppercase tracking-widest text-sm text-white disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar venta"}
      </button>
    </div>
  );
}
