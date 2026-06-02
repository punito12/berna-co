import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCustomerFile,
  listBarrios,
  CUSTOMER_TYPE_LABELS,
  SALE_CHANNEL_LABELS,
} from "@/lib/management";
import { ORDER_STATUS_LABELS } from "@/lib/admin";
import CustomerForm from "@/components/CustomerForm";
import CustomerFileEdit from "@/components/CustomerFileEdit";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Customer file: data (editable) + web orders + manual sales history.
export default async function CustomerFilePage({
  params,
}: {
  params: { id: string };
}) {
  const [customer, barrios] = await Promise.all([
    getCustomerFile(params.id),
    listBarrios(),
  ]);
  if (!customer) notFound();

  // Combined, sorted history (web orders + manual sales).
  const ordersTotal = customer.orders.reduce(
    (sum, o) =>
      o.status === "CANCELLED" ? sum : sum + (o.total - (o.shippingCost ?? 0)),
    0
  );
  const salesTotal = customer.sales.reduce((sum, s) => sum + s.net, 0);

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
      >
        ‹ Volver a clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {CUSTOMER_TYPE_LABELS[customer.type] ?? customer.type}
            {customer.barrio ? ` · ${customer.barrio.name}` : " · Sin barrio"}
            {customer.lot ? ` (lote ${customer.lot})` : ""}
            {customer.source === "WEB" ? " · alta por web" : ""}
          </p>
          {customer.phone && (
            <p className="text-sm text-muted">{customer.phone}</p>
          )}
        </div>
        <p className="font-black text-2xl text-ink">
          {pesos(ordersTotal + salesTotal)}
          <span className="ml-2 align-middle font-bold uppercase tracking-wide text-[11px] text-muted">
            total histórico
          </span>
        </p>
      </div>

      {/* Edit data (collapsible) */}
      <CustomerFileEdit>
        <CustomerForm
          mode="edit"
          barrios={barrios.map((b) => ({ id: b.id, name: b.name }))}
          initial={{
            id: customer.id,
            name: customer.name,
            type: customer.type,
            defaultDiscount: customer.defaultDiscount,
            phone: customer.phone ?? "",
            notes: customer.notes ?? "",
            barrioId: customer.barrioId ?? "",
            lot: customer.lot ?? "",
          }}
        />
      </CustomerFileEdit>

      {/* Web orders */}
      <h2 className="mb-3 mt-8 font-black uppercase tracking-tight text-xl text-ink">
        Pedidos web
      </h2>
      {customer.orders.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-6 text-sm text-muted">
          Sin pedidos web.
        </p>
      ) : (
        <div className="space-y-2">
          {customer.orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3"
            >
              <div>
                <p className="font-bold uppercase tracking-tight text-sm text-ink">
                  #{o.id.slice(-6).toUpperCase()} ·{" "}
                  {dateFmt.format(o.createdAt)}
                  <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {o.items.length} ítem{o.items.length === 1 ? "" : "s"}
                  {o.address ? ` · ${o.address}` : ""}
                </p>
              </div>
              <span className="font-black text-ink">{pesos(o.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Manual sales */}
      <h2 className="mb-3 mt-8 font-black uppercase tracking-tight text-xl text-ink">
        Ventas cargadas
      </h2>
      {customer.sales.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-6 text-sm text-muted">
          Sin ventas cargadas a mano.
        </p>
      ) : (
        <div className="space-y-2">
          {customer.sales.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3"
            >
              <div>
                <p className="font-bold uppercase tracking-tight text-sm text-ink">
                  {dateFmt.format(s.soldAt)}
                  <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {SALE_CHANNEL_LABELS[s.channel] ?? s.channel}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {s.items.length} ítem{s.items.length === 1 ? "" : "s"}
                  {s.discountAmount > 0
                    ? ` · dto ${pesos(s.discountAmount)}`
                    : ""}
                </p>
              </div>
              <span className="font-black text-ink">{pesos(s.net)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
