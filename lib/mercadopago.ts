// Mercado Pago Checkout Pro integration. SERVER-ONLY: the access token is read
// from MERCADOPAGO_ACCESS_TOKEN and never reaches the browser. Used by the API
// routes in app/api/.

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";

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

// Base URL for return/notification links. Set NEXT_PUBLIC_BASE_URL in prod;
// falls back to localhost for dev.
function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
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
    include: { items: true },
  });
  if (!order) return;

  // approved -> CONFIRMED; rejected/cancelled -> CANCELLED; else leave PENDING.
  let status: string | null = null;
  if (payment.status === "approved") status = "CONFIRMED";
  else if (payment.status === "rejected" || payment.status === "cancelled")
    status = "CANCELLED";

  // If this newly cancels the order, give the reserved stock back (once).
  const newlyCancelled = status === "CANCELLED" && order.status !== "CANCELLED";

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        mpPaymentId: String(payment.id),
        ...(status ? { status } : {}),
      },
    });

    if (newlyCancelled) {
      // Restock per (product, empanado). Stock is a JSON map per breadcrumb.
      const byProduct = new Map<string, Map<string, number>>();
      for (const it of order.items) {
        if (!byProduct.has(it.productId)) byProduct.set(it.productId, new Map());
        const m = byProduct.get(it.productId)!;
        m.set(it.breadcrumbType, (m.get(it.breadcrumbType) ?? 0) + it.quantity);
      }
      for (const [productId, perBreadcrumb] of byProduct) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stocks: true },
        });
        if (!product) continue;
        let stocks: Record<string, number> = {};
        try {
          stocks = JSON.parse(product.stocks);
        } catch {
          stocks = {};
        }
        for (const [breadcrumb, qty] of perBreadcrumb) {
          stocks[breadcrumb] = (stocks[breadcrumb] ?? 0) + qty;
        }
        const total = Object.values(stocks).reduce((a, b) => a + b, 0);
        await tx.product.update({
          where: { id: productId },
          data: { stocks: JSON.stringify(stocks), stock: total },
        });
      }
    }
  });
}
