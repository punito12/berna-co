import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import { getPaymentConfig } from "@/lib/payment-config";
import TransferInstructions from "@/components/TransferInstructions";
import { getLogo, getSiteText, isPreview, loadCmsBundle } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

// Transfer instructions screen: total to transfer, alias/CBU to copy, and a big
// WhatsApp button to send the receipt. Order stays PENDING/CONFIRMED until the
// admin confirms the payment.
export default async function TransferenciaPage({
  searchParams,
}: {
  searchParams: { id?: string; preview?: string };
}) {
  const id = searchParams.id;
  const [order, config, cms] = await Promise.all([
    id
      ? prisma.order.findUnique({
          where: { id },
          include: { items: { include: { product: true } } },
        })
      : null,
    getPaymentConfig(),
    loadCmsBundle(),
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
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  const shortId = order.id.slice(-6).toUpperCase();
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams.preview);
  const logoUrl = getLogo(cms, preview);

  return (
    <>
      <main className="min-h-screen bg-cream px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <BernaLogo
              variant="dark"
              size="sm"
              className="mx-auto"
              src={logoUrl}
            />
            <p className="mt-6 font-bold uppercase tracking-widest text-xs text-muted">
              Pedido #{shortId}
            </p>
            <h1 className="mt-2 font-black uppercase tracking-tight text-3xl leading-none text-ink sm:text-4xl">
              {getSiteText(
                cms,
                "checkout.transfer.title",
                "Transferí y mandá el comprobante",
                preview
              )}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {getSiteText(
                cms,
                "checkout.transfer.instructions",
                "Para confirmar tu pedido, transferí el monto exacto y enviá el comprobante por WhatsApp.",
                preview
              )}
            </p>
          </div>

        {/* Total a transferir — big and clear */}
        <div className="mt-6 rounded-lg border-2 border-black bg-ink p-5 text-center text-white shadow-[0_18px_45px_rgba(10,10,10,0.12)]">
          <p className="font-bold uppercase tracking-widest text-[11px] text-cream">
            {getSiteText(cms, "checkout.transfer.total_label", "Total a transferir", preview)}
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
          labels={{
            alias: getSiteText(cms, "checkout.transfer.alias_label", "Alias", preview),
            cbu: getSiteText(cms, "checkout.transfer.cbu_label", "CBU", preview),
            copy: getSiteText(cms, "checkout.transfer.copy_button", "Copiar", preview),
            copied: getSiteText(cms, "checkout.transfer.copied", "¡Copiado!", preview),
            whatsapp: getSiteText(
              cms,
              "checkout.transfer.whatsapp_button",
              "Enviar comprobante por WhatsApp",
              preview
            ),
            missingData: getSiteText(
              cms,
              "checkout.transfer.missing_data",
              "Los datos de transferencia todavía no están cargados. Escribinos por WhatsApp y te los pasamos.",
              preview
            ),
            reserved: getSiteText(
              cms,
              "checkout.transfer.reserved",
              "Tu pedido queda reservado. Lo confirmamos cuando recibamos el comprobante.",
              preview
            ),
          }}
        />

        {/* Resumen */}
        <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-[0_18px_45px_rgba(10,10,10,0.06)]">
          <h2 className="mb-3 font-black uppercase tracking-tight text-base text-ink">
            {getSiteText(cms, "checkout.step.summary", "Resumen", preview)}
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
              <span>{getSiteText(cms, "checkout.summary.shipping", "Envío", preview)}</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold uppercase tracking-wide text-ink">
              {getSiteText(cms, "checkout.summary.total", "Total", preview)}
            </span>
            <span className="font-black text-xl text-ink">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
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
