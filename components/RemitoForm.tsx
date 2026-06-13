"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  quantity: string;
  unit: "kg" | "paq.";
  description: string;
  unitPrice: string;
};

export type RemitoFormInitial = {
  id?: string;
  date: string;
  customerName: string;
  items: Item[];
  discountPercent: string;
  discountAmount: string;
  paymentMethod: string;
  note: string;
  receivedSignature: string;
  receivedClarification: string;
  receivedDate: string;
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

const emptyItem: Item = {
  quantity: "1",
  unit: "kg",
  description: "",
  unitPrice: "0",
};

export default function RemitoForm({
  initial,
}: {
  initial: RemitoFormInitial;
}) {
  const router = useRouter();
  const editing = Boolean(initial.id);
  const [date, setDate] = useState(initial.date);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [items, setItems] = useState<Item[]>(
    initial.items.length > 0 ? initial.items : [{ ...emptyItem }]
  );
  const [discountPercent, setDiscountPercent] = useState(
    initial.discountPercent
  );
  const [discountAmount, setDiscountAmount] = useState(initial.discountAmount);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod);
  const [note, setNote] = useState(initial.note);
  const [receivedSignature, setReceivedSignature] = useState(
    initial.receivedSignature
  );
  const [receivedClarification, setReceivedClarification] = useState(
    initial.receivedClarification
  );
  const [receivedDate, setReceivedDate] = useState(initial.receivedDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return acc;
      return acc + Math.round(quantity * unitPrice);
    }, 0);
    const percent = Number(discountPercent);
    const percentAmount = Number.isFinite(percent)
      ? Math.round((subtotal * Math.max(0, Math.min(100, percent))) / 100)
      : 0;
    const manualAmount = Number(discountAmount);
    const discount =
      discountAmount.trim() === "" || !Number.isFinite(manualAmount)
        ? percentAmount
        : Math.min(subtotal, Math.max(0, Math.round(manualAmount)));
    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
    };
  }, [discountAmount, discountPercent, items]);

  function setItem(index: number, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        customerName,
        items: items.map((item) => ({
          quantity: Number(item.quantity),
          unit: item.unit,
          description: item.description,
          unitPrice: Number(item.unitPrice),
        })),
        discountPercent: Number(discountPercent) || 0,
        discountAmount:
          discountAmount.trim() === "" ? undefined : Number(discountAmount),
        paymentMethod,
        note,
        receivedSignature,
        receivedClarification,
        receivedDate: receivedDate || null,
      };
      const res = await fetch(
        initial.id ? `/api/admin/remitos/${initial.id}` : "/api/admin/remitos",
        {
          method: initial.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el remito.");
        return;
      }
      router.push("/admin/remitos");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Datos del remito
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fecha">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Nombre">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputClass}
              placeholder="Cliente / razón social"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Items
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
          >
            Agregar ítem
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 rounded-lg border border-line bg-cream/30 p-3"
            >
              <label className="col-span-4 sm:col-span-2">
                <Label>Cantidad</Label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => setItem(index, { quantity: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="col-span-4 sm:col-span-2">
                <Label>Unidad</Label>
                <select
                  value={item.unit}
                  onChange={(e) =>
                    setItem(index, { unit: e.target.value as Item["unit"] })
                  }
                  className={inputClass}
                >
                  <option value="kg">kg</option>
                  <option value="paq.">paq.</option>
                </select>
              </label>
              <label className="col-span-12 sm:col-span-4">
                <Label>Descripción</Label>
                <input
                  value={item.description}
                  onChange={(e) =>
                    setItem(index, { description: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="col-span-6 sm:col-span-2">
                <Label>Precio U.</Label>
                <input
                  type="number"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => setItem(index, { unitPrice: e.target.value })}
                  className={inputClass}
                />
              </label>
              <div className="col-span-6 flex items-end justify-between gap-2 sm:col-span-2">
                <div>
                  <Label>Total</Label>
                  <p className="font-black text-ink">
                    {pesos(
                      Math.round(
                        (Number(item.quantity) || 0) *
                          (Number(item.unitPrice) || 0)
                      )
                    )}
                  </p>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Totales y pago
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Descuento %">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Monto descuento">
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className={inputClass}
              placeholder="Auto por %"
            />
          </Field>
          <Field label="Forma de pago">
            <input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputClass}
              placeholder="Efectivo / transferencia"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-2 rounded-lg border border-line bg-cream/40 p-4 text-sm sm:grid-cols-3">
          <Total label="Subtotal" value={totals.subtotal} />
          <Total label="Descuento" value={totals.discount} />
          <Total label="Total" value={totals.total} strong />
        </div>

        <Field label="Nota">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </Field>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Recibí conforme
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Firma">
            <input
              value={receivedSignature}
              onChange={(e) => setReceivedSignature(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Aclaración">
            <input
              value={receivedClarification}
              onChange={(e) => setReceivedClarification(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {error && <p className="text-sm font-bold text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/remitos")}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Cancelar
        </button>
        {editing && (
          <a
            href={`/admin/remitos/${initial.id}/imprimir`}
            className="border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Imprimir
          </a>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar remito"}
        </button>
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
    <label className="mt-3 block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}

function Total({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className={strong ? "font-black text-2xl text-ink" : "font-bold text-ink"}>
        {pesos(value)}
      </p>
    </div>
  );
}
