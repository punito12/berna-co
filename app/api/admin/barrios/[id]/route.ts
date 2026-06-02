import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { updateBarrio, deleteBarrio } from "@/lib/management";

// Updates a barrio's name. Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await updateBarrio(params.id, body.name ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}

// Deletes a barrio. Admin-only.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteBarrio(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar." },
      { status: 400 }
    );
  }
}
