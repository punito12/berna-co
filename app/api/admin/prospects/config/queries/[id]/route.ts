import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  disableProspectQuery,
  saveProspectQuery,
} from "@/lib/prospects";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof saveProspectQuery>[1];
    const query = await saveProspectQuery(params.id, body);
    return NextResponse.json({ ok: true, query });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar la consulta." },
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
    await disableProspectQuery(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo desactivar la consulta." },
      { status: 400 }
    );
  }
}

