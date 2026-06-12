import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import RetryPaymentButton from "@/components/RetryPaymentButton";
import {
  cancelUnpaidMercadoPagoOrder,
  syncPaymentToOrder,
  isMpConfigured,
} from "@/lib/mercadopago";
import { getLogo, getSiteText, isPreview, loadCmsBundle } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";

// Mercado Pago "failure" return: the payment was rejected/cancelled. We sync it
// and offer to retry with MP or contact via WhatsApp to pay another way.
export default async function ErrorPage({
  searchParams,
}: {
  searchParams: {
    id?: string;
    payment_id?: string;
    collection_id?: string;
    preview?: string;
  };
}) {
  const mpPaymentId = searchParams.payment_id || searchParams.collection_id;
  if (mpPaymentId && isMpConfigured()) {
    try {
      await syncPaymentToOrder(mpPaymentId);
    } catch (e) {
      console.error("sync on error failed:", e);
    }
  } else if (searchParams.id) {
    try {
      await cancelUnpaidMercadoPagoOrder(searchParams.id);
    } catch (e) {
      console.error("cancel unpaid MP order on error failed:", e);
    }
  }

  const [order, cms] = await Promise.all([
    searchParams.id
      ? prisma.order.findUnique({ where: { id: searchParams.id } })
      : null,
    loadCmsBundle(),
  ]);
  const shortId = order ? order.id.slice(-6).toUpperCase() : null;
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams.preview);
  const logoUrl = getLogo(cms, preview);
  const mpConfigured = isMpConfigured();

  // WhatsApp message to coordinate payment by another method.
  const waText = shortId
    ? encodeURIComponent(
        `Hola! Tuve un problema con el pago de mi pedido #${shortId}. ¿Me ayudás a coordinar otra forma de pago?`
      )
    : encodeURIComponent("Hola! Tuve un problema con el pago en la web. ¿Me ayudás?");
  const waUrl = `https://wa.me/${BUSINESS_WHATSAPP}?text=${waText}`;

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 py-12 text-center">
        <BernaLogo variant="dark" size="sm" src={logoUrl} />

        <div>
          <p className="font-bold uppercase tracking-widest text-xs text-muted">
            {getSiteText(cms, "checkout.error.eyebrow", "Pago no completado", preview)}
          </p>
          <h1 className="mt-2 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl">
            {getSiteText(cms, "checkout.error.title", "El pago no se pudo procesar", preview)}
          </h1>
          {shortId && (
            <p className="mt-3 text-muted">
              Tu pedido <span className="font-bold text-ink">#{shortId}</span>{" "}
              {getSiteText(cms, "checkout.error.not_confirmed", "quedó registrado pero sin pago confirmado.", preview)}
            </p>
          )}
        </div>

        <p className="max-w-md text-sm text-muted">
          {getSiteText(
            cms,
            "checkout.error.text",
            "El pago con Mercado Pago no se completó. Podés volver a intentarlo o coordinarnos por WhatsApp para pagar de otra forma.",
            preview
          )}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {/* Retry with MP — only when the order exists and MP is configured */}
          {order && mpConfigured && order.status !== "CANCELLED" && (
            <RetryPaymentButton
              orderId={order.id}
              label={getSiteText(cms, "checkout.error.retry_mp", "Reintentar con Mercado Pago", preview)}
            />
          )}

          {/* Coordinate via WhatsApp */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-black bg-white px-6 py-3 font-bold uppercase tracking-widest text-sm text-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white active:translate-y-0"
          >
            {getSiteText(cms, "checkout.error.whatsapp", "Coordinar por WhatsApp", preview)}
          </a>

          {/* Go back to store */}
          <Link
            href="/#productos"
            className="font-bold uppercase tracking-widest text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {getSiteText(cms, "checkout.back_to_store", "Ir a la tienda", preview)}
          </Link>
        </div>
      </main>
      <CmsFooter preview={preview} />
    </>
  );
}
