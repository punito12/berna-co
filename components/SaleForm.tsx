"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerForm, { type BarrioOption } from "@/components/CustomerForm";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductOption = {
  id: string;
  name: string;
  price: number;
  breadcrumbs: string[];
  prices: Record<string, number>;
};
// A customer search result (from /api/admin/customers/search).
type SearchResult = {
  id: string;
  name: string;
  barrio: string | null;
  lot: string | null;
  defaultDiscount: number;
};

type Line = {
  productId: string; // "" = free text
  productName: string;
  breadcrumbType: string; // chosen empanado ("" when product has none/free)
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
  barrios,
}: {
  products: ProductOption[];
  barrios: BarrioOption[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [soldAt, setSoldAt] = useState(today);
  const [channel, setChannel] = useState("WHATSAPP");
  // Customer mode: "existing" picks from the list, "new" shows the create form.
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing"
  );
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState(""); // free text
  // Live customer search (scales to thousands of customers).
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // The chosen customer's label (name + barrio/lote) to show once picked.
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);
  const [discount, setDiscount] = useState("0");
  const [discountTouched, setDiscountTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { productId: "", productName: "", breadcrumbType: "", qtyKg: "", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  // Debounced live search by name or barrio. Only runs while no customer is
  // chosen yet and there's a query.
  useEffect(() => {
    if (customerId) return; // already picked one
    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(q)}`
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, customerId]);

  // Picks a customer from the search results.
  function chooseCustomer(c: SearchResult) {
    setCustomerId(c.id);
    setCustomerName("");
    const label =
      c.name +
      (c.barrio ? ` · ${c.barrio}${c.lot ? ` (lote ${c.lot})` : ""}` : "");
    setChosenLabel(label);
    setResults([]);
    if (!discountTouched) setDiscount(String(c.defaultDiscount));
  }

  // Clears the chosen customer to search again.
  function clearCustomer() {
    setCustomerId("");
    setChosenLabel(null);
    setSearch("");
    setResults([]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // Price for a product's chosen empanado (specific price > 0, else default).
  function priceFor(p: ProductOption, breadcrumb: string): number {
    const specific = p.prices?.[breadcrumb];
    if (typeof specific === "number" && specific > 0) return specific;
    return p.price;
  }

  function pickProduct(i: number, productId: string) {
    if (!productId) {
      updateLine(i, { productId: "", productName: "", breadcrumbType: "" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    const firstBc = p?.breadcrumbs?.[0] ?? "";
    updateLine(i, {
      productId,
      productName: p?.name ?? "",
      breadcrumbType: firstBc,
      // Auto-fill unit price with the chosen empanado's price (editable).
      unitPrice: p ? String(priceFor(p, firstBc)) : "",
    });
  }

  function pickBreadcrumb(i: number, breadcrumb: string) {
    const line = lines[i];
    const p = products.find((x) => x.id === line.productId);
    updateLine(i, {
      breadcrumbType: breadcrumb,
      unitPrice: p ? String(priceFor(p, breadcrumb)) : line.unitPrice,
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { productId: "", productName: "", breadcrumbType: "", qtyKg: "", unitPrice: "" },
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
        productName:
          l.breadcrumbType && BREADCRUMB_LABELS[l.breadcrumbType]
            ? `${l.productName.trim()} (${BREADCRUMB_LABELS[l.breadcrumbType]})`
            : l.productName.trim(),
        breadcrumbType: l.breadcrumbType || undefined,
        qtyKg: Number(l.qtyKg),
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (items.length === 0)
      return setError("Agregá al menos un producto con cantidad.");
    if (customerMode === "existing" && !customerId && !customerName.trim())
      return setError("Elegí un cliente o escribí un nombre.");

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
      setLines([
        { productId: "", productName: "", breadcrumbType: "", qtyKg: "", unitPrice: "" },
      ]);
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
        <div>
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Cliente
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`flex-1 rounded border px-2 py-2 font-bold uppercase tracking-wide text-[11px] transition-colors ${
                customerMode === "existing"
                  ? "border-black bg-black text-white"
                  : "border-line text-ink hover:border-black"
              }`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`flex-1 rounded border px-2 py-2 font-bold uppercase tracking-wide text-[11px] transition-colors ${
                customerMode === "new"
                  ? "border-black bg-black text-white"
                  : "border-line text-ink hover:border-black"
              }`}
            >
              + Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Existing customer: live search by name or barrio. */}
      {customerMode === "existing" && (
        <div className="mt-3">
          {customerId && chosenLabel ? (
            // A customer is chosen — show it with an option to change.
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-cream/40 px-4 py-3">
              <span className="font-bold text-ink">{chosenLabel}</span>
              <button
                type="button"
                onClick={clearCustomer}
                className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div>
              <label className="block">
                <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
                  Buscar cliente (nombre o barrio)
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={inputClass}
                  placeholder="Empezá a escribir el nombre…"
                  autoComplete="off"
                />
              </label>

              {/* Results */}
              {search.trim() && (
                <div className="mt-2 overflow-hidden rounded-lg border border-line">
                  {searching && results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted">Buscando…</p>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted">
                      Sin resultados. Probá con otro nombre o creá un cliente
                      nuevo.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {results.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => chooseCustomer(c)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream"
                          >
                            <span className="font-bold text-ink">{c.name}</span>
                            <span className="text-xs text-muted">
                              {c.barrio
                                ? `${c.barrio}${c.lot ? ` · lote ${c.lot}` : ""}`
                                : "Sin barrio"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Free-text fallback (no customer record) */}
              <label className="mt-3 block">
                <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
                  …o nombre libre (sin ficha)
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Juan (WhatsApp)"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* New customer: same fields as the Clientes section. On create we pick
          it automatically for this sale. */}
      {customerMode === "new" && (
        <div className="mt-3 rounded-lg border border-dashed border-line bg-cream/40 p-4">
          <p className="mb-3 font-bold uppercase tracking-wide text-[11px] text-muted">
            Nuevo cliente
          </p>
          <CustomerForm
            mode="create"
            barrios={barrios}
            initial={{
              name: "",
              type: "MINORISTA",
              defaultDiscount: 10,
              phone: "",
              notes: "",
              barrioId: "",
              lot: "",
            }}
            onCreated={(c) => {
              // Switch to "existing" with the newly created customer selected.
              setCustomerMode("existing");
              setCustomerId(c.id);
              if (!discountTouched) setDiscount(String(c.defaultDiscount));
            }}
            onDone={() => setCustomerMode("existing")}
          />
        </div>
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
                  {/* Empanado selector (only when the product offers more than one) */}
                  {(() => {
                    const p = products.find((x) => x.id === line.productId);
                    if (!p || p.breadcrumbs.length <= 1) return null;
                    return (
                      <select
                        value={line.breadcrumbType}
                        onChange={(e) => pickBreadcrumb(i, e.target.value)}
                        className="mt-1 w-full rounded border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-black"
                      >
                        {p.breadcrumbs.map((b) => (
                          <option key={b} value={b}>
                            {BREADCRUMB_LABELS[b] ?? b}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
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
