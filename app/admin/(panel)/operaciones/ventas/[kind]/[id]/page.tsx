import Link from "next/link";
import { notFound } from "next/navigation";
import { getSaleDetail, type SaleKind } from "@/lib/sales-detail";
import { SALE_CHANNEL_LABELS } from "@/lib/management";
import SaleDetailActions from "@/components/SaleDetailActions";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function longDate(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  DELIVERED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};
const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  PENDING: "Confirmado",
  READY: "Confirmado",
};

// Unified detail for a web order or a manual sale. Single screen + actions.
export default async function SaleDetailPage({
  params,
}: {
  params: { kind: string; id: string };
}) {
  const kind: SaleKind | null =
    params.kind === "order" ? "ORDER" : params.kind === "sale" ? "MANUAL" : null;
  if (!kind) notFound();

  const sale = await getSaleDetail(kind, params.id);
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Print-only business header (comprobante) */}
      <div className="mb-4 hidden border-b border-black pb-3 print:block">
        <p className="font-black uppercase tracking-tight text-2xl">Berna&co</p>
        <p className="text-xs">Comprobante de pedido · #{sale.shortId}</p>
      </div>

      <Link
        href="/admin/operaciones/ventas"
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink print:hidden"
      >
        ‹ Volver a pedidos y ventas
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
            #{sale.shortId}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {SALE_CHANNEL_LABELS[sale.origin] ?? sale.origin}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                STATUS_STYLES[sale.status] ?? "bg-cream text-muted"
              }`}
            >
              {STATUS_LABELS[sale.status] ?? sale.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-2xl text-ink">{pesos(sale.total)}</p>
          <p className="text-xs text-muted">{longDate(sale.date)}</p>
        </div>
      </div>

      {/* Actions (client) */}
      <SaleDetailActions
        kind={sale.kind}
        id={sale.id}
        shortId={sale.shortId}
        status={sale.status}
        balance={sale.balance}
        total={sale.total}
        customerName={sale.customerName}
        customerPhone={sale.customerPhone}
        itemsText={sale.items
          .map((it) => `${it.quantity}x ${it.productName} (${it.breadcrumbLabel})`)
          .join(", ")}
        totalText={pesos(sale.total)}
      />

      {/* Data grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Cliente">
          <Row label="Nombre" value={sale.customerName} />
          {sale.customerPhone && (
            <Row label="Teléfono" value={sale.customerPhone} />
          )}
          {sale.customerEmail && (
            <Row label="Email" value={sale.customerEmail} />
          )}
          {sale.customerType && (
            <Row label="Tipo" value={sale.customerType} />
          )}
          {sale.barrioName && <Row label="Barrio" value={sale.barrioName} />}
          {sale.customerId && (
            <Link
              href={`/admin/clientes/${sale.customerId}`}
              className="mt-1 inline-block font-bold uppercase tracking-widest text-[11px] text-ink underline print:hidden"
            >
              Ver ficha ›
            </Link>
          )}
        </Card>

        {(sale.deliveryType || sale.scheduledDate) && (
          <Card title="Entrega">
            {sale.deliveryType && (
              <Row
                label="Tipo"
                value={sale.deliveryType === "DELIVERY" ? "Envío" : "Retiro"}
              />
            )}
            {sale.address && <Row label="Dirección" value={sale.address} />}
            {sale.scheduledDate && (
              <Row label="Fecha" value={longDate(sale.scheduledDate)} />
            )}
            {sale.scheduledSlot && (
              <Row label="Franja" value={sale.scheduledSlot} />
            )}
          </Card>
        )}

        <Card title="Pago">
          <Row label="Forma" value={sale.paymentMethodLabel} />
          <Row label="Estado" value={sale.paymentStatusLabel} />
          <Row label="Total" value={pesos(sale.total)} />
          {sale.paid > 0 && <Row label="Pagado" value={pesos(sale.paid)} />}
          {sale.balance > 0 && (
            <Row label="Saldo" value={pesos(sale.balance)} strong />
          )}
          {sale.dueDate && (
            <Row label="Vence" value={longDate(sale.dueDate)} />
          )}
        </Card>

        {sale.notes && (
          <Card title="Notas">
            <p className="text-sm italic text-muted">{sale.notes}</p>
          </Card>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
          Productos
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line">
            <tr>
              {["Producto", "Empanado", "Cant.", "Precio", "Subtotal"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`pb-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                      i >= 2 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2 text-ink">{it.productName}</td>
                <td className="py-2 text-muted">{it.breadcrumbLabel}</td>
                <td className="py-2 text-right font-bold text-ink">
                  {it.quantity}
                </td>
                <td className="py-2 text-right text-muted">
                  {pesos(it.unitPrice)}
                </td>
                <td className="py-2 text-right font-bold text-ink">
                  {pesos(it.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Descuento</span>
              <span>− {pesos(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-ink">
            <span className="uppercase tracking-wide">Total</span>
            <span className="text-lg">{pesos(sale.total)}</span>
          </div>
        </div>
      </div>

      {/* Payments history */}
      {sale.payments.length > 0 && (
        <div className="mt-6 rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 font-black uppercase tracking-tight text-lg text-ink">
            Pagos
          </h2>
          <ul className="space-y-1 text-sm">
            {sale.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-muted"
              >
                <span>
                  {p.date.toLocaleDateString("es-AR")} · {p.methodLabel}
                  {p.notes ? ` · ${p.notes}` : ""}
                </span>
                <span className="font-bold text-green-700">
                  {pesos(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-muted">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`text-right ${
          strong ? "font-black text-ink" : "font-bold text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
