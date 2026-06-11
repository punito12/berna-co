import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: { status: true, paymentMethod: true, mpPaymentId: true },
    });
    if (!order) {
      return NextResponse.json(
        { error: "No encontramos ese pedido." },
        { status: 404 }
      );
    }
    if (order.paymentMethod !== "MERCADOPAGO") {
      return NextResponse.json(
        { error: "Ese pedido no usa Mercado Pago." },
        { status: 400 }
      );
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Ese pedido está cancelado. Volvé al checkout para generar uno nuevo.",
        },
        { status: 400 }
      );
    }
    if (order.mpPaymentId) {
      return NextResponse.json(
        { error: "Ese pedido ya tiene un pago registrado." },
        { status: 400 }
      );
    }
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
