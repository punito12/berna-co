import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import { syncPaymentToOrder, isMpConfigured } from "@/lib/mercadopago";
import { getLogo, getSiteText, isPreview, loadCmsBundle } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

// Mercado Pago "failure" return: the payment was rejected/cancelled. We sync it
// (marks the order CANCELLED) and offer to retry or pay cash.
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

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 py-12 text-center">
        <BernaLogo variant="dark" size="sm" src={logoUrl} />
        <div>
          <p className="font-bold uppercase tracking-widest text-xs text-muted">
            {getSiteText(cms, "checkout.error.eyebrow", "Pago no completado", preview)}
          </p>
          <h1 className="mt-2 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl">
            {getSiteText(cms, "checkout.error.title", "No pudimos cobrar el pago", preview)}
          </h1>
          {shortId && (
            <p className="mt-3 text-muted">
              Tu pedido <span className="font-bold text-ink">#{shortId}</span>{" "}
              {getSiteText(cms, "checkout.error.not_confirmed", "no se confirmó.", preview)}
            </p>
          )}
        </div>
        <p className="max-w-md text-sm text-muted">
          {getSiteText(
            cms,
            "checkout.error.text",
            "El pago con Mercado Pago no se completó. Podés intentar de nuevo o hacer el pedido eligiendo pago en efectivo al recibir.",
            preview
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/checkout"
            className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0"
          >
            {getSiteText(cms, "checkout.error.retry", "Volver a intentar", preview)}
          </Link>
          <Link
            href="/#productos"
            className="border border-black bg-white px-6 py-3 font-bold uppercase tracking-widest text-sm text-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white active:translate-y-0"
          >
            {getSiteText(cms, "checkout.back_to_store", "Ir a la tienda", preview)}
          </Link>
        </div>
      </main>
      <CmsFooter preview={preview} />
    </>
  );
}
