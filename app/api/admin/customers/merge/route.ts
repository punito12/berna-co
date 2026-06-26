import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { mergeCustomers } from "@/lib/clients";

// Funde clientes duplicados dentro de uno primario, reasignando todo el
// historial (pedidos/ventas/remitos) en una transacción. Admin-only.
// POST { primaryId, duplicateIds: string[] }
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { primaryId?: string; duplicateIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.primaryId || !Array.isArray(body.duplicateIds)) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }
  try {
    const result = await mergeCustomers(body.primaryId, body.duplicateIds);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo fusionar." },
      { status: 400 }
    );
  }
}
