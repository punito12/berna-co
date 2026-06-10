import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setSectionConfigDraft } from "@/lib/cms-admin";

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { key?: string; config?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.key)
    return NextResponse.json({ error: "Falta la key." }, { status: 400 });
  try {
    await setSectionConfigDraft(body.key, body.config ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
