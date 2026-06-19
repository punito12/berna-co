"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type ProductOption = { id: string; name: string };

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

// Filtros del resumen de ventas. Cambia la URL (?from&to&...) y el page (server)
// recalcula. El botón "Exportar CSV" abre el endpoint con format=csv.
export default function SalesReportFilters({
  from,
  to,
  customerType,
  origin,
  paymentStatus,
  productId,
  products,
}: {
  from: string;
  to: string;
  customerType: string;
  origin: string;
  paymentStatus: string;
  productId: string;
  products: ProductOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [ct, setCt] = useState(customerType);
  const [or, setOr] = useState(origin);
  const [ps, setPs] = useState(paymentStatus);
  const [pid, setPid] = useState(productId);

  function apply() {
    const q = new URLSearchParams();
    q.set("from", f);
    q.set("to", t);
    if (ct) q.set("customerType", ct);
    if (or) q.set("origin", or);
    if (ps) q.set("paymentStatus", ps);
    if (pid) q.set("productId", pid);
    router.push(`/admin/operaciones/resumen-ventas?${q.toString()}`);
  }

  function exportCsv() {
    const q = new URLSearchParams(params.toString());
    q.set("from", f);
    q.set("to", t);
    if (ct) q.set("customerType", ct);
    else q.delete("customerType");
    if (or) q.set("origin", or);
    else q.delete("origin");
    if (ps) q.set("paymentStatus", ps);
    else q.delete("paymentStatus");
    if (pid) q.set("productId", pid);
    else q.delete("productId");
    q.set("format", "csv");
    window.location.href = `/api/admin/sales-report?${q.toString()}`;
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Desde
          </span>
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Hasta
          </span>
          <input type="date" value={t} onChange={(e) => setT(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Tipo de cliente
          </span>
          <select value={ct} onChange={(e) => setCt(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="MAYORISTA">Mayorista</option>
            <option value="MINORISTA">Minorista</option>
            <option value="KIOSCO">Kiosco</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Origen
          </span>
          <select value={or} onChange={(e) => setOr(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="WEB">Web</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="MAYORISTA">Mayorista (canal)</option>
            <option value="KIOSCO">Kiosco</option>
            <option value="MANUAL">Manual (todas)</option>
            <option value="REMITO">Remito</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Estado de pago
          </span>
          <select value={ps} onChange={(e) => setPs(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="PAID">Cobrado</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Producto
          </span>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={apply}
          className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="border border-line px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:border-black"
        >
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
