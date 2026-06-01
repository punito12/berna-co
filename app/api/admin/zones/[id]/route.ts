import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateZone, deleteZone } from "@/lib/admin";

// Updates a zone (name, polygon, weekdays, active). Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    name?: string;
    polygon?: unknown;
    daysOfWeek?: number[];
    active?: boolean;
    shippingCost?: number;
    freeShippingFrom?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await updateZone(params.id, {
      name: body.name ?? "",
      polygon: body.polygon ?? null,
      daysOfWeek: body.daysOfWeek ?? [],
      active: Boolean(body.active),
      shippingCost: Number(body.shippingCost ?? 0),
      freeShippingFrom: Number(body.freeShippingFrom ?? 0),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

// Deletes a zone. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteZone(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
