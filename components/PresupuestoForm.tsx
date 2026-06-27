"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";
import ClientSelect from "@/components/ClientSelect";
import type { RemitoProductOption } from "@/lib/remitos";

type PType = "PRICE_LIST" | "QUOTATION";

// Una línea del presupuesto en el form. Según el tipo se usan unos campos u
// otros: PRICE_LIST → listPrice; QUOTATION → quantity + unitPrice.
type Item = {
  productId: string;
  breadcrumbType: string;
  productName: string; // nombre base
  variantName: string; // empanado (etiqueta)
  listPrice: string; // P. Lista (PRICE_LIST)
  quantity: string; // cantidad (QUOTATION)
  unitPrice: string; // precio unitario (QUOTATION)
};

export type PresupuestoFormInitial = {
  id?: string;
  type: PType;
  customerName: string;
  customerId?: string | null;
  date: string; // yyyy-mm-dd
  validUntil: string; // yyyy-mm-dd | ""
  discountPercent: string;
  notesInternal: string;
  items: {
    productId?: string | null;
    breadcrumbType?: string | null;
    productName: string;
    variantName?: string;
    listPrice?: number;
    quantity?: number;
    unitPrice?: number;
  }[];
};

const CUSTOM = "__custom__";
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
  productId: "",
  breadcrumbType: "",
  productName: "",
  variantName: "",
  listPrice: "0",
  quantity: "1",
  unitPrice: "0",
};

export default function PresupuestoForm({
  initial,
  products,
}: {
  initial: PresupuestoFormInitial;
  products: RemitoProductOption[];
}) {
  const router = useRouter();
  const editing = Boolean(initial.id);

  const [type, setType] = useState<PType>(initial.type);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerId, setCustomerId] = useState<string | null>(
    initial.customerId ?? null
  );
  const [date, setDate] = useState(initial.date);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent);
  const [notesInternal, setNotesInternal] = useState(initial.notesInternal);
  const [items, setItems] = useState<Item[]>(
    initial.items.length > 0
      ? initial.items.map((it) => ({
          productId: it.productId ?? "",
          breadcrumbType: it.breadcrumbType ?? "",
          productName: it.productName,
          variantName: it.variantName ?? "",
          listPrice: String(it.listPrice ?? 0),
          quantity: String(it.quantity ?? 1),
          unitPrice: String(it.unitPrice ?? 0),
        }))
      : [{ ...emptyItem }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discount = useMemo(() => {
    const n = Number(discountPercent);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 25;
  }, [discountPercent]);

  // P. Mayor. = P. Lista * (1 - %/100). Igual que el server.
  function wholesale(listPrice: number): number {
    return Math.round(listPrice * (1 - discount / 100));
  }

  function priceFor(product: RemitoProductOption, breadcrumb: string): number {
    const cashSpecific = product.cashPrices?.[breadcrumb];
    if (typeof cashSpecific === "number" && cashSpecific > 0) return cashSpecific;
    if (product.priceCashTransfer && product.priceCashTransfer > 0) {
      return product.priceCashTransfer;
    }
    const specific = product.prices?.[breadcrumb];
    if (typeof specific === "number" && specific > 0) return specific;
    return product.price;
  }

  function setItem(index: number, patch: Partial<Item>) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function selectProduct(index: number, value: string) {
    if (value === CUSTOM) {
      setItem(index, { productId: "", breadcrumbType: "", variantName: "" });
      return;
    }
    const product = products.find((p) => p.id === value);
    if (!product) {
      setItem(index, { productId: "", breadcrumbType: "" });
      return;
    }
    const breadcrumb = product.breadcrumbs[0] ?? "";
    const price = String(priceFor(product, breadcrumb));
    setItem(index, {
      productId: product.id,
      breadcrumbType: breadcrumb,
      productName: product.name,
      variantName: breadcrumb ? BREADCRUMB_LABELS[breadcrumb] ?? breadcrumb : "",
      listPrice: price,
      unitPrice: price,
    });
  }

  function selectBreadcrumb(index: number, breadcrumb: string) {
    const item = items[index];
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      setItem(index, { breadcrumbType: "" });
      return;
    }
    const price = String(priceFor(product, breadcrumb));
    setItem(index, {
      breadcrumbType: breadcrumb,
      variantName: breadcrumb ? BREADCRUMB_LABELS[breadcrumb] ?? breadcrumb : "",
      listPrice: price,
      unitPrice: price,
    });
  }

  // Total de la cotización (suma de subtotales). Solo para QUOTATION.
  const quotationTotal = useMemo(
    () =>
      items.reduce((acc, it) => {
        const q = Number(it.quantity) || 0;
        const u = Number(it.unitPrice) || 0;
        return acc + Math.round(q * u);
      }, 0),
    [items]
  );

  function addItem() {
    setItems((cur) => [...cur, { ...emptyItem }]);
  }
  function removeItem(index: number) {
    setItems((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== index) : cur));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        customerName,
        customerId: customerId || undefined,
        date,
        validUntil: validUntil || null,
        discountPercent: discount,
        notesInternal,
        items: items
          .filter((it) => it.productName.trim())
          .map((it) => ({
            productId: it.productId || null,
            breadcrumbType: it.breadcrumbType || null,
            productName: it.productName.trim(),
            variantName: it.variantName.trim(),
            listPrice: Number(it.listPrice) || 0,
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
          })),
      };
      if (payload.items.length === 0) {
        setError("Agregá al menos un producto.");
        setSaving(false);
        return;
      }
      const res = await fetch(
        initial.id
          ? `/api/admin/presupuestos/${initial.id}`
          : "/api/admin/presupuestos",
        {
          method: initial.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el presupuesto.");
        return;
      }
      router.push("/admin/operaciones/presupuestos");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Selector de tipo de documento */}
      <section className="rounded-xl border border-line bg-white p-4">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted">
          Tipo de documento
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "PRICE_LIST", label: "Lista de precios mayorista" },
              { key: "QUOTATION", label: "Cotización" },
            ] as { key: PType; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                type === t.key
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink hover:border-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {type === "PRICE_LIST"
            ? "Lista de precios: muestra P. Lista y P. Mayor. por producto, sin cantidades ni total."
            : "Cotización: propuesta con cantidad, precio unitario, subtotal y total (como un remito, pero sin efecto operativo)."}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Datos del presupuesto
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cliente / potencial cliente">
            <ClientSelect
              name={customerName}
              customerId={customerId}
              onChange={(next) => {
                setCustomerName(next.name);
                setCustomerId(next.customerId);
              }}
            />
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Válido hasta (opcional)">
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </Field>
          {type === "PRICE_LIST" && (
            <Field label="Descuento mayorista (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
        <Field label="Nota interna (no se imprime)">
          <textarea
            value={notesInternal}
            onChange={(e) => setNotesInternal(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Solo para vos. No aparece en el documento."
          />
        </Field>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Productos
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="border border-line px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            + Agregar
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const product = products.find((p) => p.id === item.productId);
            const list = Number(item.listPrice) || 0;
            const qty = Number(item.quantity) || 0;
            const unit = Number(item.unitPrice) || 0;
            const gridCols =
              type === "PRICE_LIST"
                ? "sm:grid-cols-[1.4fr_1fr_0.9fr_0.9fr_auto]"
                : "sm:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_auto]";
            return (
              <div
                key={index}
                className={`grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:items-end ${gridCols}`}
              >
                <Field label="Producto">
                  <select
                    value={item.productId || CUSTOM}
                    onChange={(e) => selectProduct(index, e.target.value)}
                    className={inputClass}
                  >
                    <option value={CUSTOM}>Producto personalizado</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Empanado">
                  {product && product.breadcrumbs.length > 0 ? (
                    <select
                      value={item.breadcrumbType}
                      onChange={(e) => selectBreadcrumb(index, e.target.value)}
                      className={inputClass}
                    >
                      {product.breadcrumbs.map((b) => (
                        <option key={b} value={b}>
                          {BREADCRUMB_LABELS[b] ?? b}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={item.productName}
                      onChange={(e) =>
                        setItem(index, { productName: e.target.value })
                      }
                      className={inputClass}
                      placeholder="Descripción libre"
                    />
                  )}
                </Field>

                {type === "PRICE_LIST" ? (
                  <>
                    <Field label="P. Lista">
                      <input
                        type="number"
                        min={0}
                        value={item.listPrice}
                        onChange={(e) => setItem(index, { listPrice: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label={`P. Mayor. (−${discount}%)`}>
                      <div className="rounded border border-line bg-cream/40 px-3 py-2 text-sm font-bold text-ink">
                        {pesos(wholesale(list))}
                      </div>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Cantidad">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => setItem(index, { quantity: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="P. Unitario">
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => setItem(index, { unitPrice: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Subtotal">
                      <div className="rounded border border-line bg-cream/40 px-3 py-2 text-sm font-bold text-ink">
                        {pesos(Math.round(qty * unit))}
                      </div>
                    </Field>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="h-[38px] rounded border border-line px-3 text-[11px] font-bold uppercase tracking-widest text-muted hover:border-red-400 hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>

        {type === "PRICE_LIST" ? (
          <p className="mt-2 text-[11px] text-muted">
            P. Lista usa el mismo precio que los remitos. P. Mayor. se calcula
            automáticamente como P. Lista menos {discount}%.
          </p>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-line pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Total cotización
            </span>
            <span className="text-xl font-black text-ink">
              {pesos(quotationTotal)}
            </span>
          </div>
        )}
      </section>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear presupuesto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/operaciones/presupuestos")}
          className="border border-line px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:border-black"
        >
          Cancelar
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
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
