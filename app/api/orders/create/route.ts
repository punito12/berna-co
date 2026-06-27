import { NextResponse } from "next/server";
import {
  createOrder,
  OrderValidationError,
  type CreateOrderInput,
} from "@/lib/orders";
import { linkOrderToCustomer } from "@/lib/management";
import { createPreferenceForOrder, isMpConfigured } from "@/lib/mercadopago";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";

// Contexto de analytics anónimo que manda el checkout (sin PII). Opcional.
type AnalyticsCtx = {
  sessionId?: string;
  anonymousId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  locality?: string;
};

// Registra order_created del lado del server (confiable, deduplicado por
// orderId en lib/analytics). Best-effort: nunca afecta el pedido ni el pago.
async function trackOrderCreated(orderId: string, ax: AnalyticsCtx | undefined) {
  if (!ax?.sessionId || !ax?.anonymousId) return;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        total: true,
        shippingCost: true,
        paymentMethod: true,
        deliveryType: true,
      },
    });
    if (!order) return;
    await recordEvent({
      eventName: "order_created",
      sessionId: ax.sessionId,
      anonymousId: ax.anonymousId,
      orderId,
      value: Math.max(0, order.total - (order.shippingCost ?? 0)),
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryType,
      locality: ax.locality ?? null,
      utmSource: ax.utmSource,
      utmMedium: ax.utmMedium,
      utmCampaign: ax.utmCampaign,
      utmContent: ax.utmContent,
      utmTerm: ax.utmTerm,
    });
  } catch (e) {
    console.error("trackOrderCreated failed:", e);
  }
}

// Creates a PENDING order. Pricing/validation happen server-side in createOrder.
// For MERCADOPAGO it also creates a Checkout Pro preference and returns its URL.
export async function POST(request: Request) {
  let body: CreateOrderInput & { analytics?: AnalyticsCtx };
  try {
    body = (await request.json()) as CreateOrderInput & {
      analytics?: AnalyticsCtx;
    };
  } catch {
    return NextResponse.json(
      { error: "No pudimos leer el pedido." },
      { status: 400 }
    );
  }

  try {
    const result = await createOrder(body);
    // Auto-create/reuse the customer and link this order to it (best-effort).
    try {
      await linkOrderToCustomer(result.id);
    } catch (e) {
      console.error("linkOrderToCustomer failed:", e);
    }

    // Analytics: order_created (best-effort, deduplicado por orderId). Va para
    // todos los medios de pago, ANTES de redirigir a Mercado Pago.
    await trackOrderCreated(result.id, body.analytics);

    // Mercado Pago: create the preference and return its checkout URL.
    if (body.paymentMethod === "MERCADOPAGO") {
      if (!isMpConfigured()) {
        return NextResponse.json(
          { error: "El pago con Mercado Pago no está disponible por ahora." },
          { status: 503 }
        );
      }
      const pref = await createPreferenceForOrder(result.id);
      return NextResponse.json(
        { id: result.id, paymentUrl: pref.url },
        { status: 201 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Expected validation problems → 400 with a clear message for the customer.
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Anything else is a real bug — log it, show a generic message.
    console.error("orders/create error:", error);
    return NextResponse.json(
      { error: "Hubo un problema al guardar el pedido. Probá de nuevo." },
      { status: 500 }
    );
  }
}
