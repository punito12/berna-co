import { NextResponse } from "next/server";
import { syncPaymentToOrder } from "@/lib/mercadopago";
import { validateMercadoPagoWebhookSignature } from "@/lib/mp-webhook-signature";

// Mercado Pago payment notifications (server-to-server). MP sends the payment
// id; we fetch the payment and update the linked order's status. We always
// answer 200 quickly so MP doesn't keep retrying — errors are logged.
//
// MP may notify via query params (?type=payment&data.id=...) or JSON body
// ({ type, data: { id } }); we handle both.
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let type =
      url.searchParams.get("type") || url.searchParams.get("topic") || "";
    let paymentId =
      url.searchParams.get("data.id") || url.searchParams.get("id") || "";
    let body: {
      type?: string;
      action?: string;
      data?: { id?: string };
    } | null = null;

    // Fall back to the JSON body if the query string didn't carry the id.
    // Official signature docs use data.id from the URL; body fallback is only
    // for compatibility with alternate notification shapes.
    if (!paymentId || !type) {
      try {
        body = (await request.json()) as {
          type?: string;
          action?: string;
          data?: { id?: string };
        };
        if (!paymentId) paymentId = body?.data?.id ?? "";
        if (!type) type = body?.type ?? body?.action ?? "";
      } catch {
        // no/invalid body — fine
      }
    }

    const signature = validateMercadoPagoWebhookSignature({
      dataId: paymentId,
      requestId: request.headers.get("x-request-id"),
      signatureHeader: request.headers.get("x-signature"),
    });

    if (!signature.configured) {
      console.warn(
        "[mp/webhook] MERCADOPAGO_WEBHOOK_SECRET no está configurado; se acepta la notificación sin validar firma."
      );
    } else if (!signature.valid) {
      console.warn("[mp/webhook] firma inválida:", signature.reason);
      return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
    }

    const isPayment =
      type.includes("payment") || url.searchParams.get("topic") === "payment";

    if (isPayment && paymentId) {
      await syncPaymentToOrder(paymentId);
    }
  } catch (error) {
    console.error("mp/webhook error:", error);
  }
  // Always 200: MP retries on non-2xx, and our processing is idempotent.
  return NextResponse.json({ received: true });
}

// MP sometimes probes the URL with GET; answer OK.
export async function GET() {
  return NextResponse.json({ ok: true });
}
