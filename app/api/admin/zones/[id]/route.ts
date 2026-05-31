import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateZone, deleteZone } from "@/lib/admin";

// Updates a zone (name, localities, weekdays, active). Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    name?: string;
    postalCodes?: string[];
    localities?: string[];
    daysOfWeek?: number[];
    active?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await updateZone(params.id, {
      name: body.name ?? "",
      postalCodes: body.postalCodes ?? [],
      localities: body.localities ?? [],
      daysOfWeek: body.daysOfWeek ?? [],
      active: Boolean(body.active),
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
