import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createAdjustment } from "@/lib/stock-ops";

// Record a manual stock adjustment (signed, with a required reason). Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: Parameters<typeof createAdjustment>[0];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await createAdjustment(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
