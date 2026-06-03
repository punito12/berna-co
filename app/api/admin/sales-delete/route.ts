import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteSaleOrOrder } from "@/lib/sale-actions";
import type { SaleKind } from "@/lib/sales-detail";

// Hard-delete a web order or manual sale (reverts stock + Caja). Admin-only.
// Only for load errors — cancelling is the normal path.
// POST { kind: "ORDER"|"MANUAL", id }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { kind?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const kind: SaleKind | null =
    body.kind === "ORDER" ? "ORDER" : body.kind === "MANUAL" ? "MANUAL" : null;
  if (!kind || !body.id)
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });

  try {
    await deleteSaleOrOrder(kind, body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
