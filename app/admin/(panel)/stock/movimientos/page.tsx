import Link from "next/link";
import {
  listStockMovements,
  listProductsWithBreadcrumbs,
  STOCK_TABS,
  STOCK_MOVEMENT_TYPE_LABELS,
} from "@/lib/stock-ops";
import { BREADCRUMB_LABELS } from "@/lib/products";
import SubTabs from "@/components/SubTabs";

function shortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const TYPE_STYLES: Record<string, string> = {
  PRODUCTION: "bg-green-100 text-green-700",
  SALE: "bg-blue-100 text-blue-700",
  ADJUSTMENT: "bg-amber-100 text-amber-800",
  WASTE: "bg-red-100 text-red-700",
  PURCHASE: "bg-purple-100 text-purple-700",
};

// Stock → Movimientos: chronological history, filterable by product and type.
export default async function StockMovimientosPage({
  searchParams,
}: {
  searchParams: { product?: string; type?: string };
}) {
  const productId = searchParams.product || undefined;
  const type = searchParams.type || undefined;

  const [movements, products] = await Promise.all([
    listStockMovements({ productId, type, limit: 300 }),
    listProductsWithBreadcrumbs(),
  ]);

  const TYPES = Object.keys(STOCK_MOVEMENT_TYPE_LABELS);

  function buildHref(patch: { product?: string; type?: string }) {
    const sp = new URLSearchParams();
    const prod = patch.product ?? productId;
    const ty = patch.type ?? type;
    if (prod) sp.set("product", prod);
    if (ty) sp.set("type", ty);
    const qs = sp.toString();
    return `/admin/stock/movimientos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Stock
      </h1>
      <SubTabs tabs={STOCK_TABS} />
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Movimientos
      </h2>

      {/* Filters */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
      >
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Producto
          </span>
          <select
            name="product"
            defaultValue={productId ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Tipo
          </span>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {STOCK_MOVEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
        >
          Filtrar
        </button>
        {(productId || type) && (
          <Link
            href="/admin/stock/movimientos"
            className="px-3 py-2 font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
          >
            Limpiar
          </Link>
        )}
      </form>

      {movements.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          No hay movimientos para este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Fecha", "Producto", "Empanado", "Cant.", "Tipo", "Origen"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                        i === 3 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                    {shortDate(m.date)}
                  </td>
                  <td className="px-3 py-2.5 text-ink">{m.productName}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {BREADCRUMB_LABELS[m.breadcrumbType] ?? m.breadcrumbType}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${
                      m.quantity >= 0 ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {m.quantity >= 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        TYPE_STYLES[m.type] ?? "bg-cream text-muted"
                      }`}
                    >
                      {m.typeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {m.href && m.referenceLabel ? (
                      <Link href={m.href} className="underline hover:text-ink">
                        {m.referenceLabel}
                      </Link>
                    ) : (
                      m.referenceLabel || m.notes || "—"
                    )}
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
