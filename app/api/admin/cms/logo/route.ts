import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setLogoDraft } from "@/lib/cms-admin";

// Save the logo draft URL. Admin-only. POST { url }
export async function POST(request: Request) {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    await setLogoDraft(body.url ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
