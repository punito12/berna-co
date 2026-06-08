import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setSectionVisibleDraft } from "@/lib/cms-admin";

// Toggle a section's visibility (draft). Admin-only. POST { key, visible }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { key?: string; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.key)
    return NextResponse.json({ error: "Falta la key." }, { status: 400 });
  try {
    await setSectionVisibleDraft(body.key, Boolean(body.visible));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo actualizar." },
      { status: 400 }
    );
  }
}
