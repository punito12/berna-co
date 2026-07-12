// Mercado Pago Checkout Pro integration. SERVER-ONLY: the access token is read
// from MERCADOPAGO_ACCESS_TOKEN and never reaches the browser. Used by the API
// routes in app/api/.

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { prisma } from "@/lib/db";
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
    select: {
      id: true,
      total: true,
      customerName: true,
      customerEmail: true,
    },
  });
  if (!order) throw new Error("Pedido no encontrado.");

  const shortId = order.id.slice(-6).toUpperCase();

  // IMPORTANTE (consistencia de pago): le pasamos a Mercado Pago UN SOLO ítem
  // por el TOTAL FINAL del pedido (`order.total`), que ya incluye TODOS los
  // descuentos (promos por producto, 2x1/3x2, descuento por cantidad/+5
  // unidades, código, descuento por método) y el envío — calculados y guardados
  // por createOrder en lib/orders.ts. Antes se armaban los ítems desde
  // `priceAtTime` (precio unitario ANTES del descuento por cantidad) + envío,
  // así que MP cobraba el total SIN el descuento por +5 unidades. Cobrar
  // `order.total` (entero en pesos) garantiza MP == total del pedido, exacto y
  // sin problemas de redondeo/distribución. El detalle de ítems vive en nuestra
  // DB; MP solo necesita el monto a cobrar.
  const items = [
    {
      id: order.id,
      title: `Pedido Berna&Co #${shortId}`,
      quantity: 1,
      unit_price: order.total,
      currency_id: "ARS",
    },
  ];

  const base = baseUrl();

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
      mpPaymentId: true,
      notes: true,
    },
  });
  if (!order) return;

  const paymentStatus = String(payment.status ?? "");

  if (paymentStatus === "approved") {
    // Aprobación tardía sobre un pedido YA CANCELADO: el stock ya se repuso y
    // pudo venderse de nuevo, así que reactivarlo automáticamente arriesga una
    // doble venta. Registramos el cobro pero el pedido queda cancelado, con
    // una nota visible para el operador (resolver a mano: reembolsar en MP o
    // recrear el pedido).
    if (order.status === "CANCELLED") {
      const aviso =
        "PAGO MP APROBADO DESPUÉS DE LA CANCELACIÓN: el cliente pagó un pedido que ya estaba cancelado (stock ya repuesto). Resolver a mano: reembolsar en Mercado Pago o recrear el pedido.";
      await prisma.order.update({
        where: { id: order.id },
        data: {
          mpPaymentId: String(payment.id),
          paymentStatus: "PAID",
          notes: order.notes ? `${order.notes}\n\n${aviso}` : aviso,
        },
      });
      console.error(
        `[mp] pago aprobado tardío sobre pedido CANCELADO ${order.id} (payment ${payment.id}) — requiere revisión manual`
      );
      return;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPaymentId: String(payment.id),
        paymentStatus: "PAID",
        status: "CONFIRMED",
      },
    });
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
