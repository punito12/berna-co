import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  updateCostSheet,
  duplicateCostSheet,
  deleteCostSheet,
  type CostSheetInput,
} from "@/lib/cost-sheets";

// Update a cost sheet, or duplicate it (action=duplicate). Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: ({ action?: string } & CostSheetInput) | { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    if ((body as { action?: string }).action === "duplicate") {
      const s = await duplicateCostSheet(params.id);
      return NextResponse.json({ ok: true, id: s.id });
    }
    await updateCostSheet(params.id, body as CostSheetInput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    await deleteCostSheet(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
