import Link from "next/link";
import {
  listPresupuestos,
  formatPresupuestoNumber,
  formatPresupuestoMoney,
  PRESUPUESTO_TYPE_LABELS,
} from "@/lib/presupuestos";
import PresupuestoActions from "@/components/PresupuestoActions";

export const dynamic = "force-dynamic";

function shortDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const all = await listPresupuestos();
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const typeFilter = searchParams?.type ?? "";

  const rows = all.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (q && !p.customerName.toLowerCase().includes(q)) return false;
    return true;
  });

  const TYPE_TABS = [
    { key: "", label: "Todos" },
    { key: "PRICE_LIST", label: "Lista mayorista" },
    { key: "QUOTATION", label: "Cotizaciones" },
  ];

  function hrefWith(patch: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    const merged = { q: searchParams?.q, type: searchParams?.type, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return `/admin/operaciones/presupuestos${s ? `?${s}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
            Presupuestos
          </h1>
          <p className="mt-1 text-sm text-muted">
            Cotizaciones y listas de precios para clientes y potenciales clientes.
            No afectan stock, caja ni ventas.
          </p>
        </div>
        <Link
          href="/admin/operaciones/presupuestos/nuevo"
          className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          Nuevo presupuesto
        </Link>
      </div>

      {/* Filtros: por tipo + búsqueda por cliente */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_TABS.map((t) => (
            <Link
              key={t.key || "all"}
              href={hrefWith({ type: t.key || undefined })}
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                (typeFilter || "") === t.key
                  ? "bg-black text-white"
                  : "border border-line text-ink hover:border-black"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form method="get" className="ml-auto flex items-center gap-2">
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <input
            type="text"
            name="q"
            defaultValue={searchParams?.q}
            placeholder="Buscar cliente…"
            className="rounded border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-black"
          />
          <button
            type="submit"
            className="bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white"
          >
            Buscar
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center font-bold uppercase tracking-wide text-muted">
          No hay presupuestos {q || typeFilter ? "para este filtro" : "todavía"}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Número", "Tipo", "Fecha", "Cliente", "Items", "Total", "Acciones"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-cream/30">
                  <td className="px-3 py-3 font-black text-ink">
                    {formatPresupuestoNumber(p.number)}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {PRESUPUESTO_TYPE_LABELS[p.type] ?? p.type}
                  </td>
                  <td className="px-3 py-3 text-muted">{shortDate(p.date)}</td>
                  <td className="px-3 py-3 text-ink">{p.customerName}</td>
                  <td className="px-3 py-3 text-muted">{p.items.length}</td>
                  <td className="px-3 py-3 text-right font-bold text-ink">
                    {p.type === "QUOTATION" ? formatPresupuestoMoney(p.total) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <PresupuestoActions id={p.id} number={p.number} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
