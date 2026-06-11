import { NextResponse } from "next/server";
import { createPreferenceForOrder, isMpConfigured } from "@/lib/mercadopago";

// Creates a new Mercado Pago preference for an existing order.
// Called when the customer wants to retry a failed/cancelled payment.
// No auth required: the orderId is a hard-to-guess UUID; the preference is
// scoped to that order's amounts as stored server-side.
export async function POST(request: Request) {
  if (!isMpConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado." },
      { status: 503 }
    );
  }
  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "Falta el orderId." }, { status: 400 });
  }
  try {
    const pref = await createPreferenceForOrder(body.orderId);
    return NextResponse.json({ paymentUrl: pref.url });
  } catch (error) {
    console.error("[retry-payment]", error);
    return NextResponse.json(
      { error: "No pudimos generar el link de pago. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
