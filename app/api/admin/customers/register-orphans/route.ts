import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { registerAndLinkOrphanRemitos } from "@/lib/clients";

// Registra un cliente (mayorista por defecto) a partir de un nombre que solo
// existía como texto en remitos viejos, y vincula esos remitos. Admin-only.
// POST { displayName, type? }
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { displayName?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.displayName) {
    return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });
  }
  try {
    const result = await registerAndLinkOrphanRemitos(
      body.displayName,
      body.type || "MAYORISTA"
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo registrar." },
      { status: 400 }
    );
  }
}
