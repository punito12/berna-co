import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import { getPaymentConfig } from "@/lib/payment-config";
import TransferInstructions from "@/components/TransferInstructions";

// Transfer instructions screen: total to transfer, alias/CBU to copy, and a big
// WhatsApp button to send the receipt. Order stays PENDING/CONFIRMED until the
// admin confirms the payment.
export default async function TransferenciaPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;
  const [order, config] = await Promise.all([
    id
      ? prisma.order.findUnique({
          where: { id },
          include: { items: { include: { product: true } } },
        })
      : null,
    getPaymentConfig(),
  ]);

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

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <BernaLogo variant="dark" size="sm" className="mx-auto" />
          <p className="mt-6 font-bold uppercase tracking-widest text-xs text-muted">
            Pedido #{shortId}
          </p>
          <h1 className="mt-2 font-black uppercase tracking-tight text-3xl text-ink">
            Transferí y mandá el comprobante
          </h1>
          <p className="mt-3 text-sm text-muted">
            Para confirmar tu pedido, transferí el monto exacto y enviá el
            comprobante por WhatsApp.
          </p>
        </div>

        {/* Total a transferir — big and clear */}
        <div className="mt-6 rounded-xl border-2 border-black bg-ink p-5 text-center text-white">
          <p className="font-bold uppercase tracking-widest text-[11px] text-cream">
            Total a transferir
          </p>
          <p className="mt-1 font-black text-4xl">{formatPrice(order.total)}</p>
        </div>

        {/* Alias / CBU / WhatsApp (client interactivity) */}
        <TransferInstructions
          alias={config.aliasMercadoPago}
          cbu={config.cbu}
          whatsappNumber={config.whatsappNumber}
          shortId={shortId}
          total={order.total}
        />

        {/* Resumen */}
        <div className="mt-6 rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 font-black uppercase tracking-tight text-base text-ink">
            Resumen
          </h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="text-ink">
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
          {order.shippingCost > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm text-muted">
              <span>Envío</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold uppercase tracking-wide text-ink">
              Total
            </span>
            <span className="font-black text-xl text-ink">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
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
