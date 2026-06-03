import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  deleteManualSale,
  setSaleDeliveryStatus,
  markSalePaid,
} from "@/lib/management";

// Update a manual sale's status. Admin-only.
//   { action: "deliveryStatus", status: "DELIVERED"|"CANCELLED"|"PENDING" }
//   { action: "markPaid", method?: "EFECTIVO"|"MERCADO_PAGO"|"TRANSFERENCIA" }
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { action?: string; status?: string; method?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    if (body.action === "deliveryStatus") {
      await setSaleDeliveryStatus(params.id, body.status ?? "");
    } else if (body.action === "markPaid") {
      await markSalePaid(params.id, body.method ?? "EFECTIVO");
    } else {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

// Deletes a manual sale. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteManualSale(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
