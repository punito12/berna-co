import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  deleteProspectZone,
  updateProspectZone,
} from "@/lib/prospects";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Parameters<typeof updateProspectZone>[1];
    const zone = await updateProspectZone(params.id, body);
    return NextResponse.json({ ok: true, zone });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar la zona." },
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
    await deleteProspectZone(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo eliminar la zona." },
      { status: 400 }
    );
  }
}

