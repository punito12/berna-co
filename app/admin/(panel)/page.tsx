import Link from "next/link";
import {
  listOrders,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "@/lib/admin";
import { formatPrice, BREADCRUMB_LABELS } from "@/lib/products";
import { formatLongDate, deliveryTypeLabel } from "@/lib/format";
import OrderStatusControl from "@/components/OrderStatusControl";

// Orders list with status + date filters (driven by the URL query string).
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; date?: string };
}) {
  const orders = await listOrders({
    status: searchParams.status,
    date: searchParams.date,
  });

  return (
    <div>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Pedidos
      </h1>

      {/* Filters — a plain GET form so the state lives in the URL */}
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Estado
          </span>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
          >
            <option value="">Todos</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Día de entrega
          </span>
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ""}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
          />
        </label>
        <button
          type="submit"
          className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white"
        >
          Filtrar
        </button>
        <Link
          href="/admin"
          className="px-3 py-2 font-bold uppercase tracking-widest text-xs text-muted underline"
        >
          Limpiar
        </Link>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-12 text-center font-bold uppercase tracking-wide text-muted">
          No hay pedidos para mostrar.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-lg border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black uppercase tracking-tight text-ink">
                    #{order.id.slice(-6).toUpperCase()} · {order.customerName}
                  </p>
                  <p className="text-sm text-muted">
                    {order.customerPhone} · {deliveryTypeLabel(order.deliveryType)}
                  </p>
                  <p className="text-sm text-muted">
                    Entrega: {formatLongDate(order.scheduledDate)},{" "}
                    {order.scheduledSlot}
                  </p>
                  {order.deliveryType === "DELIVERY" && order.address && (
                    <p className="text-sm text-muted">📍 {order.address}</p>
                  )}
                  {order.customerId && (
                    <Link
                      href={`/admin/clientes/${order.customerId}`}
                      className="mt-1 inline-block font-bold uppercase tracking-widest text-[11px] text-ink underline-offset-4 hover:underline"
                    >
                      Ver ficha del cliente
                      {order.customer?.barrio
                        ? ` · ${order.customer.barrio.name}`
                        : ""}{" "}
                      ›
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-ink">
                    {formatPrice(order.total)}
                  </p>
                  <div className="mt-2">
                    <OrderStatusControl
                      orderId={order.id}
                      current={order.status}
                    />
                  </div>
                </div>
              </div>

              <ul className="mt-4 border-t border-line pt-3 text-sm text-ink">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 py-0.5">
                    <span>
                      <span className="font-bold">{item.quantity}x</span>{" "}
                      {item.product.name}
                      <span className="text-muted">
                        {" · "}
                        {BREADCRUMB_LABELS[item.breadcrumbType] ??
                          item.breadcrumbType}
                      </span>
                    </span>
                    <span className="text-muted">
                      {formatPrice(item.priceAtTime * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="mt-3 border-t border-line pt-3 text-sm italic text-muted">
                  Nota: {order.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
