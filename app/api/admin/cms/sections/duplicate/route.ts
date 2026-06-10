import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { duplicateSectionDraft } from "@/lib/cms-admin";

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.key)
    return NextResponse.json({ error: "Falta la key." }, { status: 400 });
  try {
    const section = await duplicateSectionDraft(body.key);
    return NextResponse.json({ ok: true, section });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo duplicar." },
      { status: 400 }
    );
  }
}
