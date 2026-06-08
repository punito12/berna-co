import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setTextDraft, restoreTextDraft } from "@/lib/cms-admin";

// Save (or restore) a text draft. Admin-only.
// POST { key, value }  |  POST { key, action: "restore" }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { key?: string; value?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.key)
    return NextResponse.json({ error: "Falta la key." }, { status: 400 });
  try {
    if (body.action === "restore") await restoreTextDraft(body.key);
    else await setTextDraft(body.key, body.value ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
