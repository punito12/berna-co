// Mercado Pago Checkout Pro integration. SERVER-ONLY: the access token is read
// from MERCADOPAGO_ACCESS_TOKEN and never reaches the browser. Used by the API
// routes in app/api/.

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";
import { recordMpPaymentIncome } from "@/lib/cash";
import { getSiteUrl } from "@/lib/seo";
import { setSaleStatus } from "@/lib/sale-actions";

const MP_FAILED_STATUSES = new Set([
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
]);

export function isMpConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function client(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }
  return new MercadoPagoConfig({ accessToken });
}

// Base URL for return/notification links. Must be canonical: Mercado Pago
// should never receive localhost, preview URLs or temporary tunnels.
function baseUrl(): string {
  return getSiteUrl().origin;
}

// Creates a Checkout Pro preference for a saved order and returns the URL to
// redirect the customer to. We reload the order from the DB so amounts are
// trustworthy (never taken from the client).
export async function createPreferenceForOrder(
  orderId: string
): Promise<{ url: string; preferenceId: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new Error("Pedido no encontrado.");

  // Build line items from the order. Shipping (if any) is a separate item so
  // the MP total matches order.total exactly.
  const items = order.items.map((it) => {
    const empanado = BREADCRUMB_LABELS[it.breadcrumbType] ?? it.breadcrumbType;
    return {
      id: it.id,
      title: `${it.product?.name ?? "Producto"} (${empanado})`,
      quantity: it.quantity,
      unit_price: it.priceAtTime,
      currency_id: "ARS",
    };
  });
  if (order.shippingCost > 0) {
    items.push({
      id: `envio-${order.id}`,
      title: "Envío",
      quantity: 1,
      unit_price: order.shippingCost,
      currency_id: "ARS",
    });
  }

  const base = baseUrl();
  const shortId = order.id.slice(-6).toUpperCase();

  const preference = await new Preference(client()).create({
    body: {
      items,
      external_reference: order.id, // links the payment back to our order
      payer: {
        name: order.customerName,
        email: order.customerEmail || undefined,
      },
      statement_descriptor: "BERNA&CO",
      metadata: { order_id: order.id, short_id: shortId },
      back_urls: {
        success: `${base}/pedido/confirmado?id=${order.id}`,
        pending: `${base}/pedido/pendiente?id=${order.id}`,
        failure: `${base}/pedido/error?id=${order.id}`,
      },
      auto_return: "approved",
      // MP notifies this URL of payment updates (server-to-server).
      notification_url: `${base}/api/mp/webhook`,
    },
  });

  const url = preference.init_point;
  if (!url) throw new Error("Mercado Pago no devolvió un link de pago.");
  return { url, preferenceId: preference.id ?? "" };
}

// Reads a payment from MP by id and applies its status to the linked order.
// Idempotent: safe to call repeatedly (webhook may fire multiple times).
export async function syncPaymentToOrder(paymentId: string): Promise<void> {
  const payment = await new Payment(client()).get({ id: paymentId });

  const orderId = payment.external_reference;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      total: true,
      customerName: true,
      mpPaymentId: true,
    },
  });
  if (!order) return;

  const paymentStatus = String(payment.status ?? "");

  if (paymentStatus === "approved") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPaymentId: String(payment.id),
        status: "CONFIRMED",
      },
    });
    const releaseRaw = (payment as { money_release_date?: string })
      .money_release_date;
    const releaseDate = releaseRaw ? new Date(releaseRaw) : null;
    const approvedRaw =
      (payment as { date_approved?: string }).date_approved || undefined;
    const approvedAt = approvedRaw ? new Date(approvedRaw) : new Date();
    const amount = Math.round(
      Number(payment.transaction_amount ?? order.total)
    );
    try {
      await recordMpPaymentIncome({
        paymentId: String(payment.id),
        orderId,
        amount,
        customerName: order.customerName,
        approvedAt,
        releaseDate,
      });
    } catch (e) {
      console.error("recordMpPaymentIncome failed:", e);
    }
    return;
  }

  if (MP_FAILED_STATUSES.has(paymentStatus)) {
    await cancelMercadoPagoOrderInternally({
      orderId: order.id,
      mpPaymentId: String(payment.id),
    });
  }
}

// Used by the Mercado Pago failure return when MP does not send payment_id in
// the URL. It only cancels the internal reserved order and restores stock; it
// does not call Mercado Pago refunds.
export async function cancelUnpaidMercadoPagoOrder(orderId: string): Promise<void> {
  await cancelMercadoPagoOrderInternally({ orderId });
}

async function cancelMercadoPagoOrderInternally({
  orderId,
  mpPaymentId,
}: {
  orderId: string;
  mpPaymentId?: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentMethod: true, mpPaymentId: true },
  });
  if (!order || order.paymentMethod !== "MERCADOPAGO") return;

  // If it is already approved/paid, never infer a refund from an internal
  // cancellation. Refunds need an explicit Mercado Pago refund flow.
  if (order.mpPaymentId && !mpPaymentId) return;

  if (order.status !== "CANCELLED") {
    await setSaleStatus("ORDER", orderId, "CANCELLED");
  }

  if (mpPaymentId && order.mpPaymentId !== mpPaymentId) {
    await prisma.order.update({
      where: { id: orderId },
      data: { mpPaymentId },
    });
  }
}
