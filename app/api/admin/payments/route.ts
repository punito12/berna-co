import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPayment } from "@/lib/payments";

// Register a payment against a sale or order. Admin-only.
// POST { amount, method, date?, notes?, saleId?, orderId? }
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    amount?: number;
    method?: string;
    date?: string;
    notes?: string;
    saleId?: string;
    orderId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await createPayment({
      amount: Number(body.amount),
      method: body.method ?? "",
      date: body.date,
      notes: body.notes,
      saleId: body.saleId,
      orderId: body.orderId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo registrar el pago." },
      { status: 400 }
    );
  }
}
