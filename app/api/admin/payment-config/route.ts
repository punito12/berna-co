import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updatePaymentConfig } from "@/lib/payment-config";

// Update the payment-method config (discounts + transfer instructions).
// Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: {
    efectivoDiscountPercent?: number;
    transferenciaDiscountPercent?: number;
    aliasMercadoPago?: string;
    cbu?: string;
    whatsappNumber?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await updatePaymentConfig({
      efectivoDiscountPercent: Number(body.efectivoDiscountPercent),
      transferenciaDiscountPercent: Number(body.transferenciaDiscountPercent),
      aliasMercadoPago: body.aliasMercadoPago ?? "",
      cbu: body.cbu ?? "",
      whatsappNumber: body.whatsappNumber ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
