import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import {
  deliveryTypeLabel,
  formatLongDate,
  paymentMethodLabel,
} from "@/lib/format";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { syncPaymentToOrder, isMpConfigured } from "@/lib/mercadopago";
import { loadCmsBundle, getLogo, getSiteText, isPreview } from "@/lib/cms";
import CmsFooter from "@/components/CmsFooter";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

// Server component: reads the saved order and shows the confirmation + WhatsApp.
// When Mercado Pago redirects here it carries payment_id/status — we sync that
// payment right away so the order status reflects it without waiting the webhook.
export default async function ConfirmadoPage({
  searchParams,
}: {
  searchParams: {
    id?: string;
    payment_id?: string;
    collection_id?: string;
    preview?: string;
  };
}) {
  const id = searchParams.id;

  const mpPaymentId = searchParams.payment_id || searchParams.collection_id;
  if (mpPaymentId && isMpConfigured()) {
    try {
      await syncPaymentToOrder(mpPaymentId);
    } catch (e) {
      console.error("sync on confirmado failed:", e);
    }
  }

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
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  const shortId = order.id.slice(-6).toUpperCase();
  const cms = await loadCmsBundle();
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams.preview);
  const waTemplate = getSiteText(cms, "checkout.whatsapp.template", "", preview);
  const whatsappUrl = buildWhatsappUrl(order, waTemplate);
  const logoUrl = getLogo(cms, preview);

  return (
    <>
      {/* Clear cart now that payment succeeded (MP redirects here on success). */}
      <ClearCartOnMount />
      <main className="min-h-screen bg-cream px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <BernaLogo
              variant="dark"
              size="sm"
              className="mx-auto"
              src={logoUrl}
            />
            <p className="mt-8 font-bold uppercase tracking-widest text-xs text-muted">
              {getSiteText(cms, "checkout.success.title", "Pedido recibido", preview)}
            </p>
            <h1 className="mt-2 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl">
              {getSiteText(cms, "checkout.confirmado.title", "¡Gracias!", preview)}
            </h1>
            <p className="mt-3 text-muted">
              Tu pedido <span className="font-bold text-ink">#{shortId}</span>{" "}
              {getSiteText(
                cms,
                "checkout.confirmado.subtitle",
                "quedó registrado. Confirmalo enviándonos el detalle por WhatsApp.",
                preview
              )}
            </p>
          </div>

        {/* WhatsApp CTA */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block w-full bg-black px-4 py-4 text-center font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0"
        >
          {getSiteText(cms, "checkout.confirmado.whatsapp_button", "Compartir por WhatsApp", preview)}
        </a>

        {/* Summary */}
        <div className="mt-8 rounded-lg border border-line bg-white p-6 shadow-[0_18px_45px_rgba(10,10,10,0.06)]">
          <h2 className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
            {getSiteText(cms, "checkout.step.summary", "Resumen", preview)}
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

          {order.shippingCost > 0 ? (
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>{getSiteText(cms, "checkout.summary.products", "Productos", preview)}</span>
                <span>{formatPrice(order.total - order.shippingCost)}</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>{getSiteText(cms, "checkout.summary.shipping", "Envío", preview)}</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
            </div>
          ) : (
            order.deliveryType === "DELIVERY" && (
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm text-muted">
                <span>{getSiteText(cms, "checkout.summary.shipping", "Envío", preview)}</span>
                <span>{getSiteText(cms, "checkout.summary.free", "Gratis", preview)}</span>
              </div>
            )
          )}

          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold uppercase tracking-wide text-ink">
              {getSiteText(cms, "checkout.summary.total", "Total", preview)}
            </span>
            <span className="font-black text-2xl text-ink">
              {formatPrice(order.total)}
            </span>
          </div>

          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <Row
              label={getSiteText(cms, "checkout.step1.name_label", "Nombre", preview)}
              value={order.customerName}
            />
            <Row
              label={getSiteText(cms, "checkout.step1.phone_label", "Teléfono", preview)}
              value={order.customerPhone}
            />
            <Row
              label={getSiteText(cms, "checkout.step2.title", "Entrega", preview)}
              value={deliveryTypeLabel(order.deliveryType)}
            />
            {order.deliveryType === "DELIVERY" && order.address && (
              <Row
                label={getSiteText(cms, "checkout.step2.address_label", "Dirección", preview)}
                value={order.address}
              />
            )}
            <Row
              label={getSiteText(cms, "checkout.step3.title", "Cuándo", preview)}
              value={`${formatLongDate(order.scheduledDate)}, ${order.scheduledSlot}`}
            />
            <Row
              label={getSiteText(cms, "checkout.step4.title", "Pago", preview)}
              value={paymentMethodLabel(order.paymentMethod)}
            />
            {order.notes && (
              <Row
                label={getSiteText(cms, "checkout.step1.notes_label", "Nota", preview)}
                value={order.notes}
              />
            )}
          </dl>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/#productos"
            className="font-bold uppercase tracking-widest text-xs text-ink underline underline-offset-4 transition-colors hover:text-muted"
          >
            {getSiteText(cms, "checkout.continue_shopping", "Seguir comprando", preview)}
          </Link>
        </div>
        </div>
      </main>
      <CmsFooter preview={preview} />
    </>
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
