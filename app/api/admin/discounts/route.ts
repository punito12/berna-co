import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createDiscountCode, type DiscountCodeInput } from "@/lib/management";

// Creates a discount code. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: DiscountCodeInput;
  try {
    body = (await request.json()) as DiscountCodeInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createDiscountCode(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear." },
      { status: 400 }
    );
  }
}
