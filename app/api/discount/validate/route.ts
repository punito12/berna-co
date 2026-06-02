import { NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/discounts";

// Public: validates a discount code against a subtotal (the checkout calls it
// to preview the discount). The real consumption happens when the order is
// created, server-side.
export async function POST(request: Request) {
  let body: { code?: string; subtotal?: number };
  try {
    body = (await request.json()) as { code?: string; subtotal?: number };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0));
  const result = await validateDiscountCode(body.code ?? "", subtotal);
  return NextResponse.json(result);
}
