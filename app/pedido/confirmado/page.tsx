import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import {
  deliveryTypeLabel,
  formatLongDate,
  paymentMethodLabel,
} from "@/lib/format";
import { buildWhatsappUrl } from "@/lib/whatsapp";

// Server component: reads the saved order and shows the confirmation + WhatsApp.
export default async function ConfirmadoPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;

  const order = id
    ? await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      })
    : null;

  if (!order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 text-center">
        <BernaLogo variant="dark" size="sm" />
        <p className="font-bold uppercase tracking-wide text-ink">
          No encontramos ese pedido.
        </p>
        <Link
          href="/"
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  const shortId = order.id.slice(-6).toUpperCase();
  const whatsappUrl = buildWhatsappUrl(order);

  return (
    <main className="min-h-screen bg-cream px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <BernaLogo variant="dark" size="sm" className="mx-auto" />
          <p className="mt-8 font-bold uppercase tracking-widest text-xs text-muted">
            Pedido recibido
          </p>
          <h1 className="mt-2 font-black uppercase tracking-tight text-4xl text-ink">
            ¡Gracias!
          </h1>
          <p className="mt-3 text-muted">
            Tu pedido <span className="font-bold text-ink">#{shortId}</span> quedó
            registrado. Confirmalo enviándonos el detalle por WhatsApp.
          </p>
        </div>

        {/* WhatsApp CTA */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block w-full bg-black px-4 py-4 text-center font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80"
        >
          Compartir por WhatsApp
        </a>

        {/* Summary */}
        <div className="mt-8 rounded-lg border border-line bg-white p-6">
          <h2 className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
            Resumen
          </h2>

          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="text-sm text-ink">
                  <span className="font-bold">{item.quantity}x</span>{" "}
                  {item.product.name}
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {BREADCRUMB_LABELS[item.breadcrumbType] ??
                      item.breadcrumbType}
                  </span>
                </span>
                <span className="font-bold text-ink">
                  {formatPrice(item.priceAtTime * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold uppercase tracking-wide text-ink">
              Total
            </span>
            <span className="font-black text-2xl text-ink">
              {formatPrice(order.total)}
            </span>
          </div>

          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Nombre" value={order.customerName} />
            <Row label="Teléfono" value={order.customerPhone} />
            <Row label="Entrega" value={deliveryTypeLabel(order.deliveryType)} />
            {order.deliveryType === "DELIVERY" && order.address && (
              <Row
                label="Dirección"
                value={
                  order.postalCode
                    ? `${order.address} (CP ${order.postalCode})`
                    : order.address
                }
              />
            )}
            <Row
              label="Cuándo"
              value={`${formatLongDate(order.scheduledDate)}, ${order.scheduledSlot}`}
            />
            <Row label="Pago" value={paymentMethodLabel(order.paymentMethod)} />
            {order.notes && <Row label="Nota" value={order.notes} />}
          </dl>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/#productos"
            className="font-bold uppercase tracking-widest text-xs text-ink underline"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
