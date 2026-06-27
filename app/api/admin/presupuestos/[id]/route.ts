import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  updatePresupuesto,
  deletePresupuesto,
  setPresupuestoStatus,
  type PresupuestoInput,
} from "@/lib/presupuestos";

// PATCH: si el body trae solo { status }, cambia el estado; si trae el
// presupuesto completo, lo actualiza. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: (PresupuestoInput & { status?: string }) | { status: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    // Cambio de estado solo (no trae items).
    if (
      "status" in body &&
      body.status &&
      !("items" in body && Array.isArray((body as PresupuestoInput).items))
    ) {
      await setPresupuestoStatus(params.id, body.status);
      return NextResponse.json({ ok: true });
    }
    await updatePresupuesto(params.id, body as PresupuestoInput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deletePresupuesto(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
