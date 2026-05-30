import { NextResponse } from "next/server";
import {
  createOrder,
  OrderValidationError,
  type CreateOrderInput,
} from "@/lib/orders";

// Creates a PENDING order. Pricing/validation happen server-side in createOrder.
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
