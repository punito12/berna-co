import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setSaleStatus } from "@/lib/sale-actions";
import type { SaleKind } from "@/lib/sales-detail";

// Unified status change for a web order or a manual sale. Admin-only.
// POST { kind: "ORDER"|"MANUAL", id, status: "CONFIRMED"|"DELIVERED"|"CANCELLED" }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { kind?: string; id?: string; status?: string };
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
    await setSaleStatus(kind, body.id, body.status ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}
