import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { reorderSectionsDraft } from "@/lib/cms-admin";

// Reorder sections (draft). Admin-only. POST { page, keys: [...] }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { page?: string; keys?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!Array.isArray(body.keys))
    return NextResponse.json({ error: "Faltan las keys." }, { status: 400 });
  try {
    await reorderSectionsDraft(body.page ?? "home", body.keys);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo reordenar." },
      { status: 400 }
    );
  }
}
