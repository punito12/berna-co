import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import { syncPaymentToOrder, isMpConfigured } from "@/lib/mercadopago";

// Mercado Pago "failure" return: the payment was rejected/cancelled. We sync it
// (marks the order CANCELLED) and offer to retry or pay cash.
export default async function ErrorPage({
  searchParams,
}: {
  searchParams: { id?: string; payment_id?: string; collection_id?: string };
}) {
  const mpPaymentId = searchParams.payment_id || searchParams.collection_id;
  if (mpPaymentId && isMpConfigured()) {
    try {
      await syncPaymentToOrder(mpPaymentId);
    } catch (e) {
      console.error("sync on error failed:", e);
    }
  }

  const order = searchParams.id
    ? await prisma.order.findUnique({ where: { id: searchParams.id } })
    : null;
  const shortId = order ? order.id.slice(-6).toUpperCase() : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 py-12 text-center">
      <BernaLogo variant="dark" size="sm" />
      <div>
        <p className="font-bold uppercase tracking-widest text-xs text-muted">
          Pago no completado
        </p>
        <h1 className="mt-2 font-black uppercase tracking-tight text-4xl text-ink">
          No pudimos cobrar el pago
        </h1>
        {shortId && (
          <p className="mt-3 text-muted">
            Tu pedido <span className="font-bold text-ink">#{shortId}</span> no se
            confirmó.
          </p>
        )}
      </div>
      <p className="max-w-md text-sm text-muted">
        El pago con Mercado Pago no se completó. Podés intentar de nuevo o hacer
        el pedido eligiendo pago en efectivo al recibir.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/checkout"
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white"
        >
          Volver a intentar
        </Link>
        <Link
          href="/#productos"
          className="border border-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-ink hover:bg-black hover:text-white"
        >
          Ir a la tienda
        </Link>
      </div>
    </main>
  );
}
