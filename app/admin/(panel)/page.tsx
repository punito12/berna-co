import Link from "next/link";
import {
  getTodayOrders,
  getStockOverview,
  ORDER_STATUS_LABELS,
} from "@/lib/admin";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import { deliveryTypeLabel } from "@/lib/format";

const LOW_STOCK = 3; // highlight stock at or below this

// Admin home: today's orders + stock overview per empanado.
export default async function AdminDashboardPage() {
  const [orders, stock] = await Promise.all([
    getTodayOrders(),
    getStockOverview(),
  ]);

  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todayTotal = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted capitalize">{todayLabel}</p>
      </div>

      {/* Today's orders */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Pedidos de hoy
          </h2>
          <span className="text-sm text-muted">
            {orders.length} pedido{orders.length === 1 ? "" : "s"} ·{" "}
            <span className="font-bold text-ink">{formatPrice(todayTotal)}</span>
          </span>
        </div>

        {orders.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-8 text-center font-bold uppercase tracking-wide text-muted">
            No hay pedidos para hoy.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href="/admin/pedidos"
                className="block rounded-lg border border-line bg-white px-4 py-3 transition-colors hover:border-black"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold uppercase tracking-tight text-sm text-ink">
                      {o.scheduledSlot} · {o.customerName}
                      <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {deliveryTypeLabel(o.deliveryType)}
                      {o.address ? ` · ${o.address}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {o.items
                        .map(
                          (it) =>
                            `${it.quantity}x ${it.product?.name ?? "Producto"} (${
                              BREADCRUMB_LABELS[it.breadcrumbType] ??
                              it.breadcrumbType
                            })`
                        )
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="font-black text-ink">
                    {formatPrice(o.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Stock overview */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">
            Stock
          </h2>
          <Link
            href="/admin/productos"
            className="font-bold uppercase tracking-widest text-[11px] text-muted underline hover:text-ink"
          >
            Editar productos
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/60">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-[10px] text-muted">
                  Producto
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-[10px] text-muted">
                  Stock por empanado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stock.map((p) => (
                <tr key={p.id} className={!p.available ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-bold text-ink">
                    {p.name}
                    {!p.available && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[10px] text-white">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {p.breadcrumbs.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        p.breadcrumbs.map((b) => {
                          const low = b.stock <= LOW_STOCK;
                          return (
                            <span
                              key={b.code}
                              className={`rounded px-2 py-1 text-xs font-bold ${
                                low
                                  ? "bg-[#c0392b] text-white"
                                  : "bg-cream text-ink"
                              }`}
                            >
                              {BREADCRUMB_LABELS[b.code] ?? b.code}: {b.stock}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          En rojo: stock en {LOW_STOCK} o menos (reponer pronto).
        </p>
      </section>
    </div>
  );
}
