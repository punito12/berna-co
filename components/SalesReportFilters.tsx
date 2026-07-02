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

  function applyWith(nextFrom: string, nextTo: string) {
    const q = new URLSearchParams();
    q.set("from", nextFrom);
    q.set("to", nextTo);
    if (ct) q.set("customerType", ct);
    if (or) q.set("origin", or);
    if (ps) q.set("paymentStatus", ps);
    if (pid) q.set("productId", pid);
    router.push(`/admin/operaciones/resumen-ventas?${q.toString()}`);
  }

  function apply() {
    applyWith(f, t);
  }

  // Rangos rápidos en hora de Argentina (yyyy-mm-dd).
  function arToday(): string {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  }
  function quickRange(kind: "today" | "7d" | "month" | "prevMonth") {
    const today = arToday();
    const [y, m] = today.split("-").map(Number);
    let nf = today;
    let nt = today;
    if (kind === "today") {
      nf = today;
      nt = today;
    } else if (kind === "7d") {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() - 6);
      nf = d.toISOString().slice(0, 10);
      nt = today;
    } else if (kind === "month") {
      nf = `${today.slice(0, 7)}-01`;
      nt = today;
    } else {
      // mes anterior completo
      const first = new Date(y, m - 2, 1);
      const last = new Date(y, m - 1, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      nf = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`;
      nt = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
    }
    setF(nf);
    setT(nt);
    applyWith(nf, nt);
  }

  const QUICK = [
    { key: "today", label: "Hoy" },
    { key: "7d", label: "Últimos 7 días" },
    { key: "month", label: "Este mes" },
    { key: "prevMonth", label: "Mes anterior" },
  ] as const;

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
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => quickRange(r.key)}
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink transition-colors hover:border-black hover:bg-cream/50"
          >
            {r.label}
          </button>
        ))}
      </div>
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
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-line px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:border-black"
          title="Vista limpia del reporte para mostrar o guardar como PDF"
        >
          Modo presentación
        </button>
      </div>
    </div>
  );
}
