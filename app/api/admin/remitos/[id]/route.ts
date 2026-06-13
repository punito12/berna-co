import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { archiveRemito, updateRemito, type RemitoInput } from "@/lib/remitos";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: RemitoInput;
  try {
    body = (await request.json()) as RemitoInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await updateRemito(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar el remito." },
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
    await archiveRemito(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo archivar el remito." },
      { status: 400 }
    );
  }
}
