import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createQuantityDiscount } from "@/lib/quantity-discounts";

// Create a volume-discount tier. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { minKg?: number; discountPercent?: number; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createQuantityDiscount({
      minKg: Number(body.minKg),
      discountPercent: Number(body.discountPercent),
      active: body.active,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
