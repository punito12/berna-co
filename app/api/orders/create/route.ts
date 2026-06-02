import { NextResponse } from "next/server";
import {
  createOrder,
  OrderValidationError,
  type CreateOrderInput,
} from "@/lib/orders";
import { linkOrderToCustomer } from "@/lib/management";
import { createPreferenceForOrder, isMpConfigured } from "@/lib/mercadopago";

// Creates a PENDING order. Pricing/validation happen server-side in createOrder.
// For MERCADOPAGO it also creates a Checkout Pro preference and returns its URL.
export async function POST(request: Request) {
  let body: CreateOrderInput;
  try {
    body = (await request.json()) as CreateOrderInput;
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
