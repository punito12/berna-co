import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPurchase } from "@/lib/purchases";

// Create a purchase. Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: Parameters<typeof createPurchase>[0];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const p = await createPurchase(body);
    return NextResponse.json({ ok: true, id: p.id });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
