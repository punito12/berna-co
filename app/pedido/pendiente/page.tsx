import Link from "next/link";
import { prisma } from "@/lib/db";
import BernaLogo from "@/components/BernaLogo";
import { syncPaymentToOrder, isMpConfigured } from "@/lib/mercadopago";

// Mercado Pago "pending" return: the payment is being processed (e.g. cash at a
// payment point, or pending review). We sync the payment and explain it will
// confirm soon.
export default async function PendientePage({
  searchParams,
}: {
  searchParams: { id?: string; payment_id?: string; collection_id?: string };
}) {
  const mpPaymentId = searchParams.payment_id || searchParams.collection_id;
  if (mpPaymentId && isMpConfigured()) {
    try {
      await syncPaymentToOrder(mpPaymentId);
    } catch (e) {
      console.error("sync on pendiente failed:", e);
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
          Pago en proceso
        </p>
        <h1 className="mt-2 font-black uppercase tracking-tight text-4xl text-ink">
          Estamos esperando el pago
        </h1>
        {shortId && (
          <p className="mt-3 text-muted">
            Tu pedido <span className="font-bold text-ink">#{shortId}</span> quedó
            registrado.
          </p>
        )}
      </div>
      <p className="max-w-md text-sm text-muted">
        Mercado Pago todavía está procesando tu pago. Apenas se acredite, tu
        pedido queda confirmado automáticamente. Si elegiste pagar en efectivo
        en un punto de pago, completá el pago y se confirmará solo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/#productos"
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white"
        >
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
