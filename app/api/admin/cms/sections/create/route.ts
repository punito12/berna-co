import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createSectionDraft } from "@/lib/cms-admin";
import { isCmsBlockType } from "@/lib/cms-blocks";

export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { page?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body.type || !isCmsBlockType(body.type)) {
    return NextResponse.json(
      { error: "Tipo de sección inválido." },
      { status: 400 }
    );
  }
  if (body.page && body.page !== "home") {
    return NextResponse.json(
      { error: "Página de sección inválida." },
      { status: 400 }
    );
  }
  try {
    const section = await createSectionDraft({
      page: body.page ?? "home",
      type: body.type,
    });
    return NextResponse.json({ ok: true, section });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo crear la sección." },
      { status: 400 }
    );
  }
}
