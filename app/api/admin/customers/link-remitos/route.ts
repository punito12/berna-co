import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { linkLegacyRemitosToCustomer } from "@/lib/clients";

// Vincula remitos viejos (solo texto, sin customerId) a un cliente registrado
// cuando el nombre normaliza igual. Admin-only.
// POST { customerId }
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { customerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.customerId) {
    return NextResponse.json({ error: "Falta el cliente." }, { status: 400 });
  }
  try {
    const linked = await linkLegacyRemitosToCustomer(body.customerId);
    return NextResponse.json({ ok: true, linked });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo vincular." },
      { status: 400 }
    );
  }
}
