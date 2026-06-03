"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SupplierOption = { id: string; name: string };

type Line = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

const UNITS = ["unidades", "kg", "cajas", "bolsas", "litros"];
const METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
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

// Form to load a purchase: supplier, date, line items (descripción × cantidad ×
// precio), a discount in pesos, optional "pagar ahora", and live totals.
export default function PurchaseForm({
  suppliers,
}: {
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(today);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState("EFECTIVO");
  const [lines, setLines] = useState<Line[]>([
    { description: "", quantity: "", unit: "unidades", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      { description: "", quantity: "", unit: "unidades", unitPrice: "" },
    ]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = useMemo(() => {
    let gross = 0;
    for (const l of lines)
      gross += Math.round((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));
    const disc = Math.min(gross, Math.max(0, Number(discount) || 0));
    return { gross, discount: disc, total: gross - disc };
  }, [lines, discount]);

  async function save() {
    setError(null);
    setSavedMsg(false);
    if (!supplierId) return setError("Elegí un proveedor.");
    const items = lines
      .filter((l) => l.description.trim() && Number(l.quantity) > 0)
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (items.length === 0)
      return setError("Agregá al menos un ítem con cantidad.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          date,
          discountAmount: Number(discount) || 0,
          notes: notes || undefined,
          items,
          payNow: payNow ? { method: payMethod } : null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "No se pudo guardar.");
      setLines([
        { description: "", quantity: "", unit: "unidades", unitPrice: "" },
      ]);
      setDiscount("0");
      setNotes("");
      setPayNow(false);
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Proveedor
          </span>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Elegí un proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
      </div>

      {/* Line items */}
      <div className="mt-6">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Ítems
        </p>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const subtotal =
              (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md bg-cream/60 p-3 sm:grid-cols-[1fr_80px_110px_110px_110px_auto] sm:items-end"
              >
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Descripción
                  </span>
                  <input
                    value={line.description}
                    onChange={(e) =>
                      updateLine(i, { description: e.target.value })
                    }
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                    placeholder="Ej: Nalga vacuna"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Cantidad
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: e.target.value })
                    }
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
                    Unidad
                  </span>
                  <select
                    value={line.unit}
                    onChange={(e) => updateLine(i, { unit: e.target.value })}
                    className="w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
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
                  aria-label="Quitar ítem"
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
          + Agregar ítem
        </button>
      </div>

      {/* Discount + notes */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Descuento ($)
          </span>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-40 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Nota (opcional)
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {/* Pay now */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-cream/30 p-3">
        <label className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-ink">
          <input
            type="checkbox"
            checked={payNow}
            onChange={(e) => setPayNow(e.target.checked)}
          />
          Pagar ahora (registra el egreso en caja)
        </label>
        {payNow && (
          <select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            className="rounded border border-line bg-white px-3 py-1.5 text-sm text-ink"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Totals */}
      <div className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>Bruto</span>
          <span>{pesos(totals.gross)}</span>
        </div>
        <div className="flex items-center justify-between text-muted">
          <span>Descuento</span>
          <span>− {pesos(totals.discount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 font-black text-ink">
          <span className="uppercase tracking-wide">Total</span>
          <span className="text-xl">{pesos(totals.total)}</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}
      {savedMsg && (
        <p className="mt-4 text-sm font-bold text-ink">Compra guardada ✓</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 w-full bg-black px-4 py-3 font-bold uppercase tracking-widest text-sm text-white disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar compra"}
      </button>
    </div>
  );
}
