import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createSupplierPayment } from "@/lib/purchases";

// Register a payment to a supplier against a purchase. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: Parameters<typeof createSupplierPayment>[0];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createSupplierPayment(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo registrar el pago." },
      { status: 400 }
    );
  }
}
