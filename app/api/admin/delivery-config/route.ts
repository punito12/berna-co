import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setDeliveryConfig } from "@/lib/delivery-config";

// Guarda la config de entrega (modo, localidades, dirección de retiro). Admin-only.
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const config = await setDeliveryConfig(body);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
